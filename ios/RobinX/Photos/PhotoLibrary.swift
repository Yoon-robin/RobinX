import Photos
import SwiftUI
import UIKit

/// 사진 보관함 접근 권한, 찾은 결과, 지우기
@MainActor
final class PhotoLibrary: NSObject, ObservableObject, PHPhotoLibraryChangeObserver {
    enum Access { case unknown, full, limited, denied }

    @Published private(set) var access: Access
    @Published private(set) var result: PhotoScanResult?
    @Published private(set) var scanning = false
    @Published private(set) var scanned = 0
    @Published private(set) var scanTotal = 0
    @Published private(set) var stage = PhotoScanner.Stage.reading
    /// 사진 보관함이 바뀐 횟수 (사진 앱에서 지우거나 새로 찍으면 는다)
    @Published private(set) var changes = 0

    /// 마지막으로 찾은 기준 (보관함이 바뀌면 이 기준으로 다시 찾는다)
    private var options = PhotoScanOptions()
    private var running: ScanFlag?
    /// 찾는 동안 들어온 다음 찾기
    private var queued: PhotoScanOptions?
    private var observing = false
    private var changeTask: Task<Void, Never>?

    override init() {
        if Launch.demo {
            access = .full
            result = Demo.photos
        } else {
            access = Self.map(PHPhotoLibrary.authorizationStatus(for: .readWrite))
        }
        super.init()
        observe()
    }

    var canRead: Bool { access == .full || access == .limited }

    private static func map(_ status: PHAuthorizationStatus) -> Access {
        switch status {
        case .authorized: .full
        case .limited: .limited
        case .notDetermined: .unknown
        default: .denied
        }
    }

    func requestAccess(options: PhotoScanOptions) async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        access = Self.map(status)
        observe()
        if canRead { await scan(options: options) }
    }

    /// 설정 앱에서 권한을 바꾸고 돌아왔을 때 다시 읽는다
    func refreshAccess() {
        guard !Launch.demo else { return }
        access = Self.map(PHPhotoLibrary.authorizationStatus(for: .readWrite))
        observe()
    }

    /// 사진 앱에서 지우거나 찍은 것을 알 수 있게 등록한다 (권한이 생긴 뒤 한 번)
    private func observe() {
        guard !Launch.demo, canRead, !observing else { return }
        PHPhotoLibrary.shared().register(self)
        observing = true
    }

    nonisolated func photoLibraryDidChange(_ changeInstance: PHChange) {
        Task { @MainActor in self.libraryChanged() }
    }

    /// 바뀐 것이 잦을 수 있어(iCloud 동기화 등) 잠깐 기다렸다가 한 번만 다시 찾는다
    private func libraryChanged() {
        changes += 1
        changeTask?.cancel()
        changeTask = Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            guard !Task.isCancelled, result != nil || scanning else { return }
            await scan(options: options)
        }
    }

    /// 사진 기준이 바뀌면 찾던 것을 멈추고 새 기준으로 다시 찾는다. 아직 한 번도 찾지 않았으면 그대로 둔다
    func settingsChanged(_ options: PhotoScanOptions) {
        guard !Launch.demo else { return }
        self.options = options
        guard result != nil || scanning else { return }
        Task { await scan(options: options, restart: true) }
    }

    /// 찾는 중에 부르면 끝난 뒤 한 번 더 찾는다. restart면 찾던 것을 멈추고 바로 다시 찾는다
    func scan(options: PhotoScanOptions, restart: Bool = false) async {
        guard canRead, !Launch.demo else { return }
        self.options = options
        if scanning {
            queued = options
            if restart { running?.cancel() }
            return
        }
        scanning = true
        var next: PhotoScanOptions? = options
        while let current = next {
            queued = nil
            let flag = ScanFlag()
            running = flag
            scanned = 0
            scanTotal = 0
            stage = .reading
            let found = await Task.detached(priority: .userInitiated) { () -> PhotoScanResult in
                var cache = PhotoCache.load()
                let found = PhotoScanner.scan(options: current, cache: &cache, isCancelled: { flag.cancelled }) {
                    stage, done, total in
                    Task { @MainActor in
                        guard !flag.cancelled else { return }
                        self.stage = stage
                        self.scanned = done
                        self.scanTotal = total
                    }
                }
                cache.save()
                return found
            }.value
            if !flag.cancelled { result = found }
            next = queued
        }
        running = nil
        scanning = false
    }

    /// 사용자가 만든 앨범 목록 (찾지 않을 앨범 고르기)
    static func albums() -> [AlbumInfo] {
        if Launch.demo { return Demo.albums }
        var list: [AlbumInfo] = []
        PHAssetCollection.fetchAssetCollections(with: .album, subtype: .albumRegular, options: nil)
            .enumerateObjects { collection, _, _ in
                list.append(AlbumInfo(
                    id: collection.localIdentifier, title: collection.localizedTitle ?? "이름 없는 앨범",
                    count: PHAsset.fetchAssets(in: collection, options: nil).count))
            }
        return list.sorted { $0.title.localizedStandardCompare($1.title) == .orderedAscending }
    }

    /// iOS가 직접 확인 창을 띄운다. 지운 사진은 "최근 삭제된 항목"에 30일 동안 남는다.
    /// 사용자가 iOS 확인 창에서 취소하면 false
    func delete(_ items: [PhotoItem]) async -> Bool {
        guard !items.isEmpty else { return false }
        if Launch.demo {
            result?.remove(items)
            return true
        }
        let assets = PHAsset.fetch(ids: items.map(\.id))
        var alive = Set<String>()
        assets.enumerateObjects { asset, _, _ in alive.insert(asset.localIdentifier) }
        // 모두 이미 사라졌으면 지운 것이 없다 (기록에 남기지 않는다)
        guard !alive.isEmpty else { return false }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.deleteAssets(assets)
            }
            // 사진 앱에서 이미 지운 것은 합계에서 두 번 빼지 않는다
            result?.remove(items.filter { alive.contains($0.id) })
            return true
        } catch {
            return false
        }
    }
}

struct AlbumInfo: Identifiable, Hashable {
    let id: String
    let title: String
    let count: Int
}

/// 썸네일. 목록에 보이는 칸만 받는다
enum ThumbLoader {
    private static let manager = PHCachingImageManager()

    /// network가 true면 iCloud에만 있는 사진도 받아 온다 (넘겨 보며 정리처럼 크게 보여 줄 때).
    /// fit이면 자르지 않고 사진 전체를 받는다 (크게 보기)
    static func load(_ id: String, side: CGFloat, network: Bool = false, fit: Bool = false) async -> UIImage? {
        if Launch.demo { return Demo.thumbnail(id, side: min(side, 600)) }
        guard let asset = PHAsset.fetch(ids: [id]).firstObject else { return nil }
        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat  // 결과를 한 번만 받는다
        options.resizeMode = .fast
        options.isNetworkAccessAllowed = network
        let scale = await MainActor.run { UIScreen.main.scale }
        return await withCheckedContinuation { continuation in
            manager.requestImage(
                for: asset, targetSize: CGSize(width: side * scale, height: side * scale),
                contentMode: fit ? .aspectFit : .aspectFill, options: options
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }
}
