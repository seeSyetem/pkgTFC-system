/**
 * auth.js
 * ระบบ login/สมัครสมาชิก + จำกัดสิทธิ์ตาม role
 * Role กำหนดจากคำนำหน้าชื่อผู้ใช้:
 *   admin... -> role "admin"  (เขียน แก้ไข ลบ เพิ่มได้ทุกอย่าง)
 *   ply-...  -> role "ply"    (เพิ่มข้อมูลได้อย่างเดียว)
 *   pks-...  -> role "pks"    (ดู/อ่านได้อย่างเดียว)
 * ⚠️ ต้องโหลดไฟล์นี้ "หลัง" supabase-api.js เสมอ (ใช้ getTableData/insertRow ร่วมกัน)
 */

const SESSION_KEY = "pkgtfc_session";

// ---------- Helper: hash รหัสผ่านด้วย SHA-256 (Web Crypto API, ไม่ต้องใช้ library) ----------
async function sha256(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ---------- ตรวจจับ role จากคำนำหน้าชื่อผู้ใช้ ----------
function deriveRole(username) {
  const u = String(username || "").trim().toLowerCase();
  if (u.startsWith("admin")) return "admin";
  if (u.startsWith("ply-")) return "ply";
  if (u.startsWith("pks-")) return "pks";
  return null;
}

// ---------- สมัครสมาชิก (อนุมัติอัตโนมัติ) ----------
async function signUp(username, password) {
  username = String(username || "").trim();
  const role = deriveRole(username);
  if (!role) {
    return { success: false, message: "ชื่อผู้ใช้ต้องขึ้นต้นด้วย admin, ply- หรือ pks- เท่านั้น เช่น ply-01, pks-03" };
  }
  if (!password || password.length < 4) {
    return { success: false, message: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร" };
  }

  const existing = await getTableData("app_users", "select=id&username=eq." + encodeURIComponent(username));
  if (existing && !existing.error && existing.length > 0) {
    return { success: false, message: "มีชื่อผู้ใช้นี้อยู่แล้ว กรุณาเลือกชื่ออื่น" };
  }

  const password_hash = await sha256(password);
  const result = await insertRow("app_users", { username, password_hash, role });
  if (result && result.error) {
    return { success: false, message: "สมัครไม่สำเร็จ: " + result.message };
  }
  return { success: true, message: "สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ", role };
}

// ---------- เข้าสู่ระบบ ----------
async function logIn(username, password) {
  username = String(username || "").trim();
  const rows = await getTableData("app_users", "select=*&username=eq." + encodeURIComponent(username));
  if (!rows || rows.error || rows.length === 0) {
    return { success: false, message: "ไม่พบชื่อผู้ใช้นี้ในระบบ" };
  }
  const user = rows[0];
  const hash = await sha256(password);
  if (hash !== user.password_hash) {
    return { success: false, message: "รหัสผ่านไม่ถูกต้อง" };
  }
  const session = { username: user.username, role: user.role };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { success: true, session };
}

// ---------- ออกจากระบบ ----------
function logOut() {
  localStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

// ---------- อ่าน session ปัจจุบัน ----------
function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// ---------- ปรับ UI ตาม role ----------
function applyRoleUI(session) {
  document.body.classList.remove("role-admin", "role-ply", "role-pks");
  document.body.classList.add("role-" + session.role);

  const badge = document.getElementById("session-user-badge");
  if (badge) {
    const roleLabel = { admin: "ผู้ดูแลระบบ", ply: "เพิ่มข้อมูล", pks: "ดูอย่างเดียว" }[session.role] || session.role;
    badge.textContent = session.username + " (" + roleLabel + ")";
  }
}

// ---------- แสดง/ซ่อนหน้าจอ login ----------
function showAuthScreen(show) {
  const overlay = document.getElementById("authOverlay");
  const appRoot = document.getElementById("appRoot");
  if (overlay) overlay.style.display = show ? "flex" : "none";
  if (appRoot) appRoot.style.display = show ? "none" : "";
}

// ---------- ผูก event ปุ่มในหน้า login/สมัครสมาชิก ----------
function wireAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authMsg = document.getElementById("authMessage");
  const showSignup = document.getElementById("showSignupBtn");
  const showLogin = document.getElementById("showLoginBtn");

  if (showSignup) showSignup.addEventListener("click", function () {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("signupBox").style.display = "block";
    authMsg.textContent = "";
  });
  if (showLogin) showLogin.addEventListener("click", function () {
    document.getElementById("signupBox").style.display = "none";
    document.getElementById("loginBox").style.display = "block";
    authMsg.textContent = "";
  });

  if (loginForm) loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authMsg.style.color = "#334155";
    authMsg.textContent = "กำลังเข้าสู่ระบบ...";
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;
    const res = await logIn(username, password);
    if (res.success) {
      applyRoleUI(res.session);
      showAuthScreen(false);
      if (typeof refreshDashboard === "function") refreshDashboard();
    } else {
      authMsg.style.color = "#dc2626";
      authMsg.textContent = "❌ " + res.message;
    }
  });

  if (signupForm) signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    authMsg.style.color = "#334155";
    authMsg.textContent = "กำลังสมัครสมาชิก...";
    const username = document.getElementById("signupUsername").value;
    const password = document.getElementById("signupPassword").value;
    const res = await signUp(username, password);
    if (res.success) {
      authMsg.style.color = "#16a34a";
      authMsg.textContent = "✅ " + res.message;
      signupForm.reset();
      setTimeout(function () {
        document.getElementById("signupBox").style.display = "none";
        document.getElementById("loginBox").style.display = "block";
      }, 1200);
    } else {
      authMsg.style.color = "#dc2626";
      authMsg.textContent = "❌ " + res.message;
    }
  });
}

// ---------- เริ่มทำงานตอนโหลดหน้า ----------
document.addEventListener("DOMContentLoaded", function () {
  wireAuthForms();
  const session = getSession();
  if (session) {
    applyRoleUI(session);
    showAuthScreen(false);
  } else {
    showAuthScreen(true);
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logOut);
});
