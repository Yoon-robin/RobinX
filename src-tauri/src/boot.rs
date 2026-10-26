//! 시작 화면(터미널 부팅 화면)에 보여 줄 이 PC 정보.
//!
//! 읽기만 하고 화면에만 쓴다. 어디에도 저장하거나 보내지 않는다. 못 읽은 값은 비워 두고 화면이 그 줄을 뺀다.

use serde::Serialize;

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootInfo {
    /// Windows 사용자 이름 (프롬프트 `C:\Users\<이름>>`에 쓴다)
    user: Option<String>,
    computer: Option<String>,
    /// 사용자 폴더 (`C:\Users\robin`)
    home: Option<String>,
    /// "Windows 11 Pro 25H2"
    os: Option<String>,
    /// "26200.6899"
    build: Option<String>,
    cpu: Option<String>,
    /// 논리 프로세서 수
    threads: Option<usize>,
    memory_total: Option<u64>,
    memory_free: Option<u64>,
    /// 켜진 지 몇 초
    uptime_secs: Option<u64>,
    /// "C:"
    system_drive: Option<String>,
    disk_total: Option<u64>,
    disk_free: Option<u64>,
    admin: bool,
}

#[cfg(windows)]
pub fn read() -> BootInfo {
    use winreg::RegKey;
    use winreg::enums::HKEY_LOCAL_MACHINE;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let nt = hklm.open_subkey(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion");
    let nt_str = |name: &str| {
        nt.as_ref()
            .ok()
            .and_then(|k| k.get_value::<String, _>(name).ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
    };
    let build_no = nt_str("CurrentBuild");
    let ubr = nt
        .as_ref()
        .ok()
        .and_then(|k| k.get_value::<u32, _>("UBR").ok());
    let os = nt_str("ProductName").map(|name| {
        // Windows 11도 ProductName은 "Windows 10 …"으로 남아 있다. 빌드 22000부터 11이다.
        let eleven = build_no
            .as_deref()
            .and_then(|b| b.parse::<u32>().ok())
            .is_some_and(|b| b >= 22000);
        let name = if eleven {
            name.replacen("Windows 10", "Windows 11", 1)
        } else {
            name
        };
        match nt_str("DisplayVersion") {
            Some(v) => format!("{name} {v}"),
            None => name,
        }
    });
    let build = build_no.map(|b| match ubr {
        Some(u) => format!("{b}.{u}"),
        None => b,
    });
    let cpu = hklm
        .open_subkey(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        .and_then(|k| k.get_value::<String, _>("ProcessorNameString"))
        .ok()
        .map(|s| s.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|s| !s.is_empty());

    let (memory_total, memory_free) = memory();
    let system_drive = std::env::var("SystemDrive").ok();
    let space = system_drive
        .as_deref()
        .and_then(|d| robin_storage::system::disk_space(&format!("{d}\\")));
    let env = |name: &str| std::env::var(name).ok().filter(|s| !s.is_empty());

    BootInfo {
        user: env("USERNAME"),
        computer: env("COMPUTERNAME"),
        home: env("USERPROFILE"),
        os,
        build,
        cpu,
        threads: std::thread::available_parallelism().ok().map(|n| n.get()),
        memory_total,
        memory_free,
        uptime_secs: Some(
            unsafe { windows::Win32::System::SystemInformation::GetTickCount64() } / 1000,
        ),
        system_drive,
        disk_total: space.map(|s| s.0),
        disk_free: space.map(|s| s.1),
        admin: robin_storage::system::is_elevated(),
    }
}

#[cfg(windows)]
fn memory() -> (Option<u64>, Option<u64>) {
    use windows::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
    let mut status = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };
    match unsafe { GlobalMemoryStatusEx(&mut status) } {
        Ok(()) => (Some(status.ullTotalPhys), Some(status.ullAvailPhys)),
        Err(_) => (None, None),
    }
}

#[cfg(not(windows))]
pub fn read() -> BootInfo {
    BootInfo::default()
}
