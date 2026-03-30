/* ==============================================
   YACINE HUB — script.js
   ============================================== */

// ── SUPABASE CONFIG ──────────────────────────────
const SUPABASE_URL  = 'https://ztwdojobjpsaoecszcbf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0d2Rvam9ianBzYW9lY3N6Y2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjY5MjYsImV4cCI6MjA5MDQwMjkyNn0.JyncU-OXv8c51yxyfns-0uoBTWDMXWnJXGfKYJwuNHc';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
 
// ── ADMIN ────────────────────────────────────────
const ADMIN_EMAIL = 'yacine.admin@yacinehub.local';
 
// ── EMAIL BUILDER ────────────────────────────────
// Supabase يحتاج إيميل — نبنيه من الاسم تلقائياً
// "ياسين" + "سيتي" → "ياسين.سيتي@yacinehub.local"
function buildEmail(first, last) {
	const clean = str => str.trim().toLowerCase().replace(/\s+/g, '_');
	return `${clean(first)}.${clean(last)}@yacinehub.local`;
}
 
// ── SCREENS ──────────────────────────────────────
function showScreen(name) {
	document.getElementById('login-screen').style.display     = name === 'login'     ? 'flex'  : 'none';
	document.getElementById('dashboard-screen').style.display = name === 'dashboard' ? 'block' : 'none';
}
 
// ── PRELOAD ──────────────────────────────────────
window.addEventListener('load', () => {
	document.body.classList.remove('is-preload');
});
 
// ── CHECK EXISTING SESSION ───────────────────────
(async () => {
	const { data: { session } } = await sb.auth.getSession();
	if (session) goToDashboard();
})();
 
// ── TAB SWITCHER ─────────────────────────────────
function switchTab(tab) {
	const isLogin = tab === 'login';
	document.getElementById('form-login').style.display    = isLogin ? 'block' : 'none';
	document.getElementById('form-register').style.display = isLogin ? 'none'  : 'block';
	document.getElementById('tab-login').classList.toggle('active',    isLogin);
	document.getElementById('tab-register').classList.toggle('active', !isLogin);
}
 
// ── SIGN IN ───────────────────────────────────────
async function doLogin() {
	const first = document.getElementById('login-firstname').value.trim();
	const last  = document.getElementById('login-lastname').value.trim();
	const pass  = document.getElementById('login-pass').value;
	const errEl = document.getElementById('login-error');
 
	errEl.textContent = '';
	errEl.className   = 'error-msg';
 
	if (!first || !last || !pass) {
		errEl.textContent = 'يرجى ملء جميع الحقول';
		return;
	}
 
	setBtnLoading('login', true);
 
	const { error } = await sb.auth.signInWithPassword({
		email:    buildEmail(first, last),
		password: pass
	});
 
	if (error) {
		errEl.textContent = 'اسم خاطئ أو كلمة مرور غلط';
		setBtnLoading('login', false);
	} else {
		showSkeleton(() => goToDashboard());
	}
}
 
// ── SIGN UP ───────────────────────────────────────
async function doRegister() {
	const first   = document.getElementById('reg-firstname').value.trim();
	const last    = document.getElementById('reg-lastname').value.trim();
	const pass    = document.getElementById('reg-pass').value;
	const confirm = document.getElementById('reg-pass-confirm').value;
	const errEl   = document.getElementById('reg-error');
 
	errEl.textContent = '';
	errEl.className   = 'error-msg';
 
	if (!first || !last || !pass || !confirm) {
		errEl.textContent = 'يرجى ملء جميع الحقول';
		return;
	}
	if (pass.length < 8) {
		errEl.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
		return;
	}
	if (pass !== confirm) {
		errEl.textContent = 'كلمتا المرور غير متطابقتين';
		return;
	}
 
	const namePattern = /^[\u0600-\u06FFa-zA-Z\s]+$/;
	if (!namePattern.test(first) || !namePattern.test(last)) {
		errEl.textContent = 'الاسم يجب أن يحتوي على أحرف فقط';
		return;
	}
 
	setBtnLoading('register', true);
 
	const { error } = await sb.auth.signUp({
		email:    buildEmail(first, last),
		password: pass,
		options: {
			data: { first_name: first, last_name: last, full_name: `${first} ${last}` }
		}
	});
 
	if (error) {
		console.log("Full Error Detail:", error);
		// سيظهر "لماذا" رفض سوبابيس الطلب (مثلاً: Password should be at least 6 characters)
		const errEl = document.getElementById('reg-error');
		errEl.textContent = error.message;
		setBtnLoading('register', false);
	} else {
		showSkeleton(() => goToDashboard());
	}
}
 
// ── GO TO DASHBOARD ───────────────────────────────
async function goToDashboard() {
	// إخفاء اللوجين وإظهار الداشبورد في نفس الصفحة
	showScreen('dashboard');
 
	// جلب اسم المستخدم
	const name = await getUserProfile();
	document.getElementById('welcome-msg').innerText = `أهلاً بك، ${name} 👋`;
 
	// فحص صلاحية الأدمن
	checkAdmin();
}
 
// ── LOGOUT ────────────────────────────────────────
async function logout() {
	await sb.auth.signOut();
	showScreen('login');
}
 
// ── USER PROFILE ─────────────────────────────────
async function getUserProfile() {
	const { data: { user } } = await sb.auth.getUser();
	if (user) return user.user_metadata.first_name || 'المبدع';
	return 'المبدع';
}
 
// ── ADMIN ─────────────────────────────────────────
async function checkAdmin() {
	const { data: { user } } = await sb.auth.getUser();
	if (user && user.email === ADMIN_EMAIL) {
		document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
	}
}
 
// ── LESSON NAVIGATION ────────────────────────────
function openLesson(lessonId) {
	window.location.href = `lesson.html?id=${lessonId}`;
}
 
// ── HELPERS ───────────────────────────────────────
function setBtnLoading(form, loading) {
	const isLogin  = form === 'login';
	const btnId    = isLogin ? 'login-btn'      : 'reg-btn';
	const textId   = isLogin ? 'login-btn-text' : 'reg-btn-text';
	const loaderId = isLogin ? 'login-loader'   : 'reg-loader';
 
	document.getElementById(btnId).disabled         = loading;
	document.getElementById(textId).style.display   = loading ? 'none'  : 'block';
	document.getElementById(loaderId).style.display = loading ? 'block' : 'none';
}
 
function showSkeleton(callback) {
	document.getElementById('skeleton-overlay').classList.add('show');
	setTimeout(() => {
		document.getElementById('skeleton-overlay').classList.remove('show');
		callback();
	}, 1200);
}
 
// ── EVENT LISTENERS ───────────────────────────────
document.getElementById('login-pass').addEventListener('keydown', e => {
	if (e.key === 'Enter') doLogin();
});
document.getElementById('reg-pass-confirm').addEventListener('keydown', e => {
	if (e.key === 'Enter') doRegister();
});
document.getElementById('login-btn').addEventListener('click', doLogin);
document.getElementById('reg-btn').addEventListener('click', doRegister);
 
