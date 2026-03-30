/* ==============================================
   YACINE HUB — script.js
   ============================================== */

// ── SUPABASE CONFIG ──────────────────────────────
const SUPABASE_URL  = 'https://ztwdojobjpsaoecszcbf.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0d2Rvam9ianBzYW9lY3N6Y2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjY5MjYsImV4cCI6MjA5MDQwMjkyNn0.JyncU-OXv8c51yxyfns-0uoBTWDMXWnJXGfKYJwuNHc';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);
 
// ── LOAD ─────────────────────────────────────────
// جلب الدروس مباشرة عند تحميل الصفحة
window.addEventListener('load', async () => {
	document.body.classList.remove('is-preload');
	loadLessons();
});
 
// ── LESSONS ──────────────────────────────────────
async function loadLessons() {
	const { data, error } = await sb.from('lessons').select('*');
	const container = document.getElementById('lessons-list');
 
	if (error) {
		console.log("Full Error Detail:", error);
		container.innerHTML = `<p style="color:#ff6b6b; padding:20px;">حدث خطأ في جلب الدروس</p>`;
		return;
	}
 
	if (data && data.length > 0) {
		container.innerHTML = data.map(lesson => `
			<div class="card" onclick="openLesson('${lesson.id}')">
				<h3>${lesson.title}</h3>
				<p>${lesson.description}</p>
			</div>
		`).join('');
	} else {
		container.innerHTML = `<p style="color:var(--gray-light); padding:20px;">لا توجد دروس بعد</p>`;
	}
}
 
// ── LESSON NAVIGATION ────────────────────────────
function openLesson(lessonId) {
	window.location.href = `lesson.html?id=${lessonId}`;
}
 
// ── فحص الأدمن عبر الرابط السري ──────────────────
window.addEventListener('load', () => {
	// نجلب ما مكتوب في الرابط بعد علامة الاستفهام
	const urlParams = new URLSearchParams(window.location.search);
 
	// إذا كتبت في الرابط ?mode=admin
	if (urlParams.get('mode') === 'admin') {
		// نبحث عن كل شيء مخصص للأدمن ونظهره
		document.querySelectorAll('.admin-only').forEach(el => {
			el.style.display = 'block';
		});
		console.log("تم تفعيل وضع الأدمن بنجاح ✅");
	}
});
  
