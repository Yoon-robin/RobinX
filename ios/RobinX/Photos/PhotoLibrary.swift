import Photos
import SwiftUI
import UIKit

/// 사진 보관함 접근 권한, 찾은 결과, 지우기
@MainActor
final class PhotoLibrary: ObservableObject {
    enum Access { case unknown, full, limited, denied }

    @Published private(set) var access: Access
    @Published private(set) var result: PhotoScanResult?
    @Published private(set) var scanning = false
    @Published private(set) var scanned = 0
    @Published private(set) var scanTotal = 0

    init() {
        if Launch.demo {
            access = .full
            result = Demo.photos
        } else {
            access = Self.map(PHPhotoLibrary.authorizationStatus(for: .readWrite))
        }
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

    func requestAccess() async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        access = Self.map(status)
        if canRead { await scan() }
    }

    /// 설정 앱에서 권한을 바꾸고 돌아왔을 때 다시 읽는다
    func refreshAccess() {
        guard !Launch.demo else { return }
        access = Self.map(PHPhotoLibrary.authorizationStatus(for: .readWrite))
    }

    func scan() async {
        guard canRead, !scanning, !Launch.demo else { return }
        scanning = true
        scanned = 0
        scanTotal = 0
        let found = await Task.detached(priority: .userInitiated) {
            PhotoScanner.scan { done, total in
                Task { @MainActor in
                    self.scanned = done
                    self.scanTotal = total
                }
            }
        }.value
        result = found
        scanning = false
    }

    /// iOS가 직접 확인 창을 띄운다. 지운 사진은 "최근 삭제된 항목"에 30일 동안 남는다.
    /// 사용자가 iOS 확인 창에서 취소하면 false
    func delete(_ ids: Set<String>) async -> Bool {
        guard !ids.isEmpty else { return false }
        if Launch.demo {
            result?.remove(ids)
            return true
        }
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: Array(ids), options: nil)
        do {
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.deleteAssets(assets)
            }
            result?.remove(ids)
            return true
        } catch {
            return false
        }
    }
}

/// 썸네일. 목록에 보이는 칸만 받는다
enum ThumbLoader {
    private static let manager = PHCachingImageManager()

    static func load(_ id: String, side: CGFloat) async -> UIImage? {
        if Launch.demo { return Demo.thumbnail(id) }
        guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { return nil }
        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat  // 결과를 한 번만 받는다
        options.resizeMode = .fast
        options.isNetworkAccessAllowed = false
        let scale = await MainActor.run { UIScreen.main.scale }
        return await withCheckedContinuation { continuation in
            manager.requestImage(
                for: asset, targetSize: CGSize(width: side * scale, height: side * scale),
                contentMode: .aspectFill, options: options
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }
}
