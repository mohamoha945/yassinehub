/* =============================================
   yacine_citys — script.js
   ============================================= */

// ---- SUPABASE CONFIG ----
// غيّر هذين السطرين ببياناتك من: Supabase → Settings → API
const SUPABASE_URL      = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- STATE ----
let tutorials     = [];
let currentFilter = 'all';

// ---- INIT ----
document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initCounters();
    initFilters();
    initHelpForm();
    initAdminModal();
    initScrollReveal();

    await checkAccess();
    await fetchTutorials();
});

/* ================================================
   1. DEVICE ID + ADMIN CHECK
   ================================================ */

function getDeviceId() {
    let id = localStorage.getItem('yacine_device_id');
    if (!id) {
        id = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        localStorage.setItem('yacine_device_id', id);
    }
    return id;
}

async function checkAccess() {
    const deviceId = getDeviceId();

    // سجّل الزيارة
    await db.from('site_visitors').upsert(
        { device_id: deviceId, last_visit: new Date().toISOString() },
        { onConflict: 'device_id' }
    );

    // تحقق هل هذا الجهاز آدمن؟
    const { data: adminData } = await db
        .from('admin_devices')
        .select('device_id')
        .eq('device_id', deviceId)
        .single();

    if (adminData) {
        document.body.classList.add('is-admin');
        showAdminElements();
    } else {
        document.body.classList.remove('is-admin');
        hideAdminElements();
    }
}

function showAdminElements() {
    const btn = document.getElementById('openAdminBtn');
    if (btn) btn.style.display = 'inline-flex';
}

function hideAdminElements() {
    const btn = document.getElementById('openAdminBtn');
    if (btn) btn.style.display = 'none';
}

/* ================================================
   2. FETCH TUTORIALS FROM SUPABASE
   ================================================ */

async function fetchTutorials() {
    const grid = document.getElementById('tutorialsGrid');
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;opacity:0.4"></i></div>`;

    const { data, error } = await db
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Supabase error:', error);
        grid.innerHTML = `<div class="empty-state">تعذّر تحميل الدروس، تحقق من الاتصال</div>`;
        return;
    }

    tutorials = data || [];
    renderTutorials(currentFilter);
}

/* ================================================
   3. NAV
   ================================================ */

function initNav() {
    const toggle     = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('navMobile');

    toggle.addEventListener('click', () => mobileMenu.classList.toggle('open'));

    document.querySelectorAll('.mobile-link').forEach(link =>
        link.addEventListener('click', () => mobileMenu.classList.remove('open'))
    );

    window.addEventListener('scroll', () => {
        const nav = document.getElementById('nav');
        nav.style.borderBottomColor = window.scrollY > 50
            ? 'rgba(255,255,255,0.12)'
            : 'var(--gray-border)';
    });
}

/* ================================================
   4. COUNTERS
   ================================================ */

function initCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-num').forEach(c => observer.observe(c));
}

function animateCounter(el) {
    const target   = parseInt(el.dataset.target);
    const duration = 1500;
    const step     = target / (duration / 16);
    let current    = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(current);
        }
    }, 16);
}

/* ================================================
   5. RENDER TUTORIALS
   ================================================ */

function renderTutorials(filter = 'all') {
    const grid     = document.getElementById('tutorialsGrid');
    const filtered = filter === 'all'
        ? tutorials
        : tutorials.filter(t => t.category === filter);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state">
            <i class="fas fa-folder-open" style="font-size:2rem;margin-bottom:1rem;display:block;opacity:0.3"></i>
            لا توجد دروس في هذا التصنيف بعد
        </div>`;
        return;
    }

    grid.innerHTML = filtered.map(t => `
        <div class="tutorial-card" data-id="${t.id}">
            <div class="card-cat">${getCatIcon(t.category)} ${t.category}</div>
            <div class="card-title">${t.title}</div>
            <div class="card-content">${t.content}</div>
            <div class="card-footer">
                <span class="card-date">${formatDate(t.created_at)}</span>
                ${t.video_url
                    ? `<a href="${t.video_url}" target="_blank" class="card-video-link">
                        <i class="fab fa-youtube"></i> مشاهدة الفيديو
                       </a>`
                    : `<span class="card-video-link" style="opacity:0.3"><i class="fas fa-file-alt"></i> نصي فقط</span>`
                }
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.tutorial-card').forEach((card, i) => {
        card.style.opacity   = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity    = '1';
            card.style.transform  = 'translateY(0)';
        }, i * 80);
    });
}

function getCatIcon(cat) {
    const icons = {
        Community : '<i class="fas fa-users"></i>',
        Roles     : '<i class="fas fa-shield-alt"></i>',
        Bots      : '<i class="fas fa-robot"></i>',
        Design    : '<i class="fas fa-palette"></i>'
    };
    return icons[cat] || '<i class="fas fa-book"></i>';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

/* ================================================
   6. FILTERS
   ================================================ */

function initFilters() {
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTutorials(currentFilter);
        });
    });
}

/* ================================================
   7. HELP FORM → SUPABASE
   ================================================ */

function initHelpForm() {
    const form = document.getElementById('helpForm');
    const msg  = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name    = document.getElementById('visitorName').value.trim();
        const discord = document.getElementById('visitorDiscord').value.trim();
        const details = document.getElementById('requestDetails').value.trim();
        const nsfw    = document.getElementById('nsfwCheck').checked;

        if (!name || !details) {
            showMsg(msg, 'يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        if (!nsfw) {
            showMsg(msg, 'يجب التأكيد بأن السيرفر Not NSFW', 'error');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled  = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        const { error } = await db.from('help_requests').insert([{
            visitor_name    : name,
            visitor_discord : discord,
            request_details : details,
            is_nsfw         : false
        }]);

        if (error) {
            showMsg(msg, 'حدث خطأ، حاول مرة ثانية', 'error');
            btn.disabled  = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
            return;
        }

        form.reset();
        btn.innerHTML        = '<i class="fas fa-check"></i> تم الإرسال!';
        btn.style.background = '#4ade80';
        btn.style.color      = '#000';

        setTimeout(() => {
            btn.innerHTML        = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
            btn.style.background = '';
            btn.style.color      = '';
            btn.disabled         = false;
        }, 3000);

        showMsg(msg, '✅ تم إرسال طلبك! سيتواصل معك ياسين على الديسكورد قريباً.', 'success');
    });
}

function showMsg(el, text, type) {
    el.textContent = text;
    el.className   = `form-message ${type}`;
    setTimeout(() => {
        el.className   = 'form-message';
        el.textContent = '';
    }, 5000);
}

/* ================================================
   8. ADMIN MODAL → SAVE TO SUPABASE
   ================================================ */

function initAdminModal() {
    const openBtn  = document.getElementById('openAdminBtn');
    const closeBtn = document.getElementById('closeAdminBtn');
    const modal    = document.getElementById('adminModal');
    const saveBtn  = document.getElementById('saveTutorialBtn');

    openBtn.addEventListener('click', () => {
        modal.classList.add('open');
        if (document.body.classList.contains('is-admin')) {
            loadVisitorLogs();
        }
    });
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
    });

    saveBtn.addEventListener('click', async () => {
        const title    = document.getElementById('newTitle').value.trim();
        const category = document.getElementById('newCategory').value;
        const content  = document.getElementById('newContent').value.trim();
        const video    = document.getElementById('newVideo').value.trim();

        if (!title || !content) {
            alert('يرجى ملء العنوان والمحتوى');
            return;
        }

        saveBtn.disabled  = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        const { error } = await db.from('tutorials').insert([{
            title,
            category,
            content,
            video_url: video || null
        }]);

        if (error) {
            alert('حدث خطأ: ' + error.message);
            saveBtn.disabled  = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الدرس';
            return;
        }

        document.getElementById('newTitle').value   = '';
        document.getElementById('newContent').value = '';
        document.getElementById('newVideo').value   = '';

        saveBtn.innerHTML = '<i class="fas fa-check"></i> تم الحفظ!';
        setTimeout(async () => {
            modal.classList.remove('open');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الدرس';
            saveBtn.disabled  = false;
            await fetchTutorials();
        }, 1200);
    });
}

/* ================================================
   9. VISITOR LOGS (Admin only)
   ================================================ */

async function loadVisitorLogs() {
    const logDiv = document.getElementById('visitorLog');
    const list   = document.getElementById('visitorList');
    if (!logDiv || !list) return;

    logDiv.style.display = 'block';

    const { data } = await db
        .from('site_visitors')
        .select('*')
        .order('last_visit', { ascending: false });

    if (!data || data.length === 0) {
        list.innerHTML = '<li style="color:var(--gray-text)">لا يوجد زوار بعد</li>';
        return;
    }

    list.innerHTML = data.map(v => `
        <li style="margin-bottom:5px;border-bottom:1px solid #222;padding-bottom:4px">
            <span style="opacity:0.5">ID:</span> ${v.device_id}
            &nbsp;|&nbsp;
            <span style="opacity:0.5">آخر ظهور:</span>
            ${new Date(v.last_visit).toLocaleString('ar-EG')}
        </li>
    `).join('');
}

/* ================================================
   10. SCROLL REVEAL
   ================================================ */

function initScrollReveal() {
    const targets  = document.querySelectorAll('.section-title, .about-bio, .help-rules, .section-sub');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity   = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    targets.forEach(el => {
        el.style.opacity    = '0';
        el.style.transform  = 'translateY(24px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}
