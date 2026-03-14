use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use tauri::Manager;

#[derive(Serialize)]
struct BackupRecord {
    filename: String,
    path: String,
    encrypted: bool,
    size: u64,
    updated_at: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct EncryptedBackupEnvelope {
    version: u8,
    salt: String,
    nonce: String,
    ciphertext: String,
}

fn resolve_db_path<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    db_key: &str,
) -> Result<PathBuf, String> {
    let mut primary = app
        .path()
        .app_config_dir()
        .map_err(|err: tauri::Error| err.to_string())?;
    primary.push(db_key);
    if primary.exists() {
        return Ok(primary);
    }

    let mut fallback = app
        .path()
        .app_data_dir()
        .map_err(|err: tauri::Error| err.to_string())?;
    fallback.push(db_key);
    Ok(fallback)
}

#[tauri::command]
fn resolve_account_db_uri(app: tauri::AppHandle, db_key: String) -> Result<String, String> {
    let path = resolve_db_path(&app, &db_key)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    Ok(format!("sqlite:{}", path.display()))
}

fn backup_dir<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    db_key: &str,
) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err: tauri::Error| err.to_string())?;
    dir.push("backups");
    dir.push(db_key.replace('.', "_"));
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    Ok(dir)
}

fn log_file_path<R: tauri::Runtime>(app: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err: tauri::Error| err.to_string())?;
    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;
    dir.push("debug.log");
    Ok(dir)
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|err| err.to_string())?;
    Ok(key)
}

fn encrypt_bytes(bytes: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; 16];
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut nonce_bytes);

    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    let nonce = Nonce::from_slice(&nonce_bytes);
    let encrypted = cipher
        .encrypt(nonce, bytes)
        .map_err(|err| err.to_string())?;

    let envelope = EncryptedBackupEnvelope {
        version: 1,
        salt: BASE64.encode(salt),
        nonce: BASE64.encode(nonce_bytes),
        ciphertext: BASE64.encode(encrypted),
    };

    serde_json::to_vec(&envelope).map_err(|err| err.to_string())
}

fn decrypt_bytes(bytes: &[u8], password: &str) -> Result<Vec<u8>, String> {
    let envelope: EncryptedBackupEnvelope =
        serde_json::from_slice(bytes).map_err(|err| err.to_string())?;
    let salt = BASE64.decode(envelope.salt).map_err(|err| err.to_string())?;
    let nonce_bytes = BASE64.decode(envelope.nonce).map_err(|err| err.to_string())?;
    let ciphertext = BASE64
        .decode(envelope.ciphertext)
        .map_err(|err| err.to_string())?;
    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));

    cipher
        .decrypt(Nonce::from_slice(&nonce_bytes), ciphertext.as_ref())
        .map_err(|_| "备份密码不正确或备份文件已损坏。".to_string())
}

fn to_iso_time(path: &Path) -> String {
    let modified = path
        .metadata()
        .and_then(|meta| meta.modified())
        .unwrap_or(std::time::SystemTime::now());
    let seconds = modified
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    seconds.to_string()
}

#[tauri::command]
fn write_export_file(
    app: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<String, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|err: tauri::Error| err.to_string())?;
    dir.push("exports");

    fs::create_dir_all(&dir).map_err(|err| err.to_string())?;

    let mut path: PathBuf = dir;
    path.push(filename);

    fs::write(&path, content).map_err(|err| err.to_string())?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn append_debug_log(app: tauri::AppHandle, message: String) -> Result<String, String> {
    let path = log_file_path(&app)?;
    let line = format!("{} {}\n", chrono_like_stamp(), message);
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|err| err.to_string())?;
    file.write_all(line.as_bytes())
        .map_err(|err| err.to_string())?;
    Ok(path.display().to_string())
}

#[tauri::command]
fn create_database_backup(
    app: tauri::AppHandle,
    db_key: String,
    password: Option<String>,
) -> Result<String, String> {
    let db_path = resolve_db_path(&app, &db_key)?;
    let contents = fs::read(&db_path).map_err(|err| err.to_string())?;
    let mut target = backup_dir(&app, &db_key)?;
    let stamp = chrono_like_stamp();

    let filename = if password.as_ref().is_some_and(|value| !value.is_empty()) {
        format!("{db_key}-backup-{stamp}.sdbbak.enc")
    } else {
        format!("{db_key}-backup-{stamp}.sdbbak")
    };

    target.push(filename);

    let final_bytes = if let Some(password) = password {
        if password.is_empty() {
            contents
        } else {
            encrypt_bytes(&contents, &password)?
        }
    } else {
        contents
    };

    fs::write(&target, final_bytes).map_err(|err| err.to_string())?;
    Ok(target.display().to_string())
}

#[tauri::command]
fn list_database_backups(app: tauri::AppHandle, db_key: String) -> Result<Vec<BackupRecord>, String> {
    let dir = backup_dir(&app, &db_key)?;
    let mut records = Vec::new();

    for entry in fs::read_dir(&dir).map_err(|err| err.to_string())? {
        let entry = entry.map_err(|err| err.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(filename) = path.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if !(filename.ends_with(".sdbbak") || filename.ends_with(".sdbbak.enc")) {
            continue;
        }

        let meta = path.metadata().map_err(|err| err.to_string())?;
        records.push(BackupRecord {
            filename: filename.to_string(),
            path: path.display().to_string(),
            encrypted: filename.ends_with(".enc"),
            size: meta.len(),
            updated_at: to_iso_time(&path),
        });
    }

    records.sort_by(|a, b| b.filename.cmp(&a.filename));
    Ok(records)
}

#[tauri::command]
fn restore_database_backup(
    app: tauri::AppHandle,
    db_key: String,
    filename: String,
    password: Option<String>,
) -> Result<(), String> {
    let mut backup_path = backup_dir(&app, &db_key)?;
    backup_path.push(&filename);
    let bytes = fs::read(&backup_path).map_err(|err| err.to_string())?;
    let restored_bytes = if filename.ends_with(".enc") {
        let password = password.unwrap_or_default();
        if password.is_empty() {
            return Err("恢复加密备份时必须提供密码。".to_string());
        }
        decrypt_bytes(&bytes, &password)?
    } else {
        bytes
    };

    let db_path = resolve_db_path(&app, &db_key)?;
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    fs::write(db_path, restored_bytes).map_err(|err| err.to_string())
}

fn chrono_like_stamp() -> String {
    let now = chrono_stub::now_local_parts();
    format!(
        "{:04}{:02}{:02}-{:02}{:02}{:02}",
        now.year, now.month, now.day, now.hour, now.minute, now.second
    )
}

mod chrono_stub {
    use std::time::{SystemTime, UNIX_EPOCH};

    pub struct Parts {
        pub year: i32,
        pub month: u32,
        pub day: u32,
        pub hour: u32,
        pub minute: u32,
        pub second: u32,
    }

    pub fn now_local_parts() -> Parts {
        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        let days = secs / 86_400;
        let rem = secs % 86_400;
        let hour = (rem / 3_600) as u32;
        let minute = ((rem % 3_600) / 60) as u32;
        let second = (rem % 60) as u32;

        let z = days + 719468;
        let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
        let doe = z - era * 146097;
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        let y = yoe + era * 400;
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        let mp = (5 * doy + 2) / 153;
        let day = (doy - (153 * mp + 2) / 5 + 1) as u32;
        let month = (mp + if mp < 10 { 3 } else { -9 }) as u32;
        let year = (y + (month <= 2) as i64) as i32;

        Parts {
            year,
            month,
            day,
            hour,
            minute,
            second,
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            resolve_account_db_uri,
            append_debug_log,
            write_export_file,
            create_database_backup,
            list_database_backups,
            restore_database_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running 道痕日记本 StoneDiary");
}
