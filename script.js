/* =============================================
   yacine_citys — script.js
   ============================================= */

// ---- SUPABASE CONFIG ----
// غيّر هذين السطرين ببياناتك من: Supabase → Settings → API
const SUPABASE_URL      = 'https://hdwmfckgxhpbkwsfsdma.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkd21mY2tneGhwYmt3c2ZzZG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ3OTYsImV4cCI6MjA5MDQwMDc5Nn0.oeqVQvJsPoNjUPSoMrXiPLO3fg-M5-rXZYIKd2xO7c4';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let tutorials = [];
let currentFilter = 'all';
let stepCount = 0;
let pendingDeleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initCounters();
    initFilters();
    initHelpForm();
    initAdminModal();
    initStepsModal();
    initScrollReveal();
    initConfirmDeleteModal();

    await checkAccess();
    await fetchTutorials();
});

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
    await db.from('site_visitors').upsert(
        { device_id: deviceId, last_visit: new Date().toISOString() },
        { onConflict: 'device_id' }
    );

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

function getYoutubeEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/watch')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function renderTutorials(filter = 'all') {
    const grid = document.getElementById('tutorialsGrid');
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
            <div class="card-title">${escapeHtml(t.title)}</div>
            <div class="card-content">${escapeHtml(t.content)}</div>
            <div class="card-footer">
                <span class="card-date">${formatDate(t.created_at)}</span>
                ${t.video_url
                    ? `<a href="${t.video_url}" target="_blank" class="card-video-link">
                        <i class="fab fa-youtube"></i> فتح الفيديو
                       </a>`
                    : `<span class="card-video-link" style="opacity:0.3"><i class="fas fa-file-alt"></i> نصي فقط</span>`
                }
            </div>
            ${t.steps && t.steps.length > 0
                ? `<button class="btn btn-outline view-steps-btn" style="width:100%;margin-top:1rem;font-size:0.85rem;justify-content:center;" data-id="${t.id}">
                    <i class="fas fa-list-ol"></i> عرض الخطوات (${t.steps.length})
                   </button>`
                : ''
            }
        </div>
    `).join('');

    grid.querySelectorAll('.tutorial-card').forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 80);

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-video-link') || e.target.closest('.view-steps-btn')) {
                return;
            }
            const id = card.dataset.id;
            const tutorial = tutorials.find(t => String(t.id) === String(id));
            if (tutorial) openStepsModal(tutorial);
        });
    });

    grid.querySelectorAll('.view-steps-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            const tutorial = tutorials.find(t => String(t.id) === String(id));
            if (tutorial) openStepsModal(tutorial);
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getCatIcon(cat) {
    const icons = {
        Community: '<i class="fas fa-users"></i>',
        Roles: '<i class="fas fa-shield-alt"></i>',
        Bots: '<i class="fas fa-robot"></i>',
        Design: '<i class="fas fa-palette"></i>'
    };
    return icons[cat] || '<i class="fas fa-book"></i>';
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function initStepsModal() {
    const modal = document.getElementById('stepsModal');
    const closeBtn = document.getElementById('closeStepsBtn');
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('open');
    });
}

function openStepsModal(tutorial) {
    const modal = document.getElementById('stepsModal');
    const title = document.getElementById('stepsModalTitle');
    const content = document.getElementById('stepsContent');
    const isAdmin = document.body.classList.contains('is-admin');

    title.textContent = tutorial.title;
    
    let videoHtml = '';
    if (tutorial.video_url) {
        const embedUrl = getYoutubeEmbedUrl(tutorial.video_url);
        videoHtml = `
            <div class="video-container" style="margin: 1rem 0; border-radius: 12px; overflow: hidden;">
                <iframe src="${embedUrl}" frameborder="0" allowfullscreen style="width:100%; height:300px; border-radius:12px;"></iframe>
                <div style="margin-top: 0.5rem; text-align: center;">
                    <a href="${tutorial.video_url}" target="_blank" class="btn btn-outline" style="font-size:0.8rem;">
                        <i class="fab fa-youtube"></i> فتح الفيديو على يوتيوب
                    </a>
                </div>
            </div>
        `;
    }
    
    let descriptionHtml = '';
    if (tutorial.content) {
        descriptionHtml = `
            <div style="margin: 1rem 0; padding: 1rem; background: var(--gray-mid); border-radius: 12px; border: 1px solid var(--gray-border);">
                <h4 style="margin-bottom: 0.5rem; color: var(--white);"><i class="fas fa-align-left"></i> شرح الدرس:</h4>
                <p style="color: var(--gray-text); line-height: 1.7;">${escapeHtml(tutorial.content)}</p>
            </div>
        `;
    }
    
    let stepsHtml = '';
    if (tutorial.steps && tutorial.steps.length > 0) {
        stepsHtml = `
            <div style="margin: 1rem 0;">
                <h4 style="margin-bottom: 1rem; color: var(--white);"><i class="fas fa-list-ol"></i> خطوات الشرح:</h4>
                ${tutorial.steps.map((s, index) => `
                    <div class="step-card">
                        <div class="step-num"><i class="fas fa-chevron-left"></i> الخطوة ${index + 1}</div>
                        <p class="step-text-view">${escapeHtml(s.text)}</p>
                        ${s.img ? `<img src="${s.img}" alt="خطوة ${index + 1}" class="step-img-view">` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    let adminDeleteHtml = '';
    if (isAdmin) {
        adminDeleteHtml = `
            <button class="delete-tutorial-btn-inside" data-id="${tutorial.id}" data-title="${escapeHtml(tutorial.title)}">
                <i class="fas fa-trash"></i> حذف الدرس
            </button>
        `;
    }
    
    content.innerHTML = videoHtml + descriptionHtml + stepsHtml + adminDeleteHtml;
    modal.classList.add('open');
    
    if (isAdmin) {
        const deleteBtn = content.querySelector('.delete-tutorial-btn-inside');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const id = deleteBtn.dataset.id;
                const title = deleteBtn.dataset.title;
                openConfirmDeleteModal(id, title);
            });
        }
    }
}

function initAdminModal() {
    const openBtn = document.getElementById('openAdminBtn');
    const closeBtn = document.getElementById('closeAdminBtn');
    const modal = document.getElementById('adminModal');
    const saveBtn = document.getElementById('saveTutorialBtn');
    const addStepBtn = document.getElementById('addStepBtn');
    const stepsContainer = document.getElementById('stepsContainer');

    openBtn.addEventListener('click', () => {
        stepCount = 0;
        if (stepsContainer) stepsContainer.innerHTML = '';
        modal.classList.add('open');
        if (document.body.classList.contains('is-admin')) {
            loadVisitorLogs();
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        resetSteps();
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('open');
            resetSteps();
        }
    });

    if (addStepBtn) {
        addStepBtn.onclick = () => {
            stepCount++;
            const stepHtml = `
                <div class="step-input">
                    <small class="step-label">الخطوة ${stepCount}</small>
                    <input type="text" placeholder="عنوان الخطوة أو وصف سريع" class="step-text">
                    <input type="url" placeholder="رابط صورة الخطوة (اختياري)" class="step-img">
                </div>`;
            stepsContainer.insertAdjacentHTML('beforeend', stepHtml);
        };
    }

    saveBtn.addEventListener('click', async () => {
        const title = document.getElementById('newTitle').value.trim();
        const category = document.getElementById('newCategory').value;
        const content = document.getElementById('newContent').value.trim();
        const video = document.getElementById('newVideo').value.trim();

        if (!title || !content) {
            alert('يرجى ملء العنوان والمحتوى');
            return;
        }

        const stepElements = document.querySelectorAll('.step-input');
        const steps = Array.from(stepElements).map(el => ({
            text: el.querySelector('.step-text').value.trim(),
            img: el.querySelector('.step-img').value.trim()
        })).filter(s => s.text);

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        const { error } = await db.from('tutorials').insert([{
            title,
            category,
            content,
            video_url: video || null,
            steps: steps.length > 0 ? steps : null
        }]);

        if (error) {
            alert('حدث خطأ: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الدرس';
            return;
        }

        document.getElementById('newTitle').value = '';
        document.getElementById('newContent').value = '';
        document.getElementById('newVideo').value = '';
        resetSteps();

        saveBtn.innerHTML = '<i class="fas fa-check"></i> تم الحفظ!';
        setTimeout(async () => {
            modal.classList.remove('open');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الدرس';
            saveBtn.disabled = false;
            await fetchTutorials();
        }, 1200);
    });
}

function resetSteps() {
    stepCount = 0;
    const container = document.getElementById('stepsContainer');
    if (container) container.innerHTML = '';
}

async function loadVisitorLogs() {
    const logDiv = document.getElementById('visitorLog');
    const list = document.getElementById('visitorList');
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

function initConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    const closeBtn = document.getElementById('closeConfirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelConfirmDeleteBtn');
    const executeBtn = document.getElementById('executeDeleteBtn');
    const input = document.getElementById('confirmDeleteInput');
    
    if (closeBtn) closeBtn.addEventListener('click', () => closeConfirmDeleteModal());
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeConfirmDeleteModal());
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeConfirmDeleteModal();
        });
    }
    if (executeBtn) {
        executeBtn.addEventListener('click', () => executeDelete());
    }
    if (input) {
        input.addEventListener('input', function() {
            const deleteBtn = document.getElementById('executeDeleteBtn');
            if (deleteBtn) {
                deleteBtn.disabled = this.value.trim() !== 'ايوه';
            }
        });
    }
}

function openConfirmDeleteModal(id, title) {
    pendingDeleteId = id;
    const modal = document.getElementById('confirmDeleteModal');
    const input = document.getElementById('confirmDeleteInput');
    const deleteBtn = document.getElementById('executeDeleteBtn');
    
    if (input) input.value = '';
    if (deleteBtn) deleteBtn.disabled = true;
    if (modal) modal.classList.add('open');
}

function closeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) modal.classList.remove('open');
    pendingDeleteId = null;
}

async function executeDelete() {
    if (!pendingDeleteId) return;
    
    const deleteBtn = document.getElementById('executeDeleteBtn');
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';
    
    const { error } = await db
        .from('tutorials')
        .delete()
        .eq('id', pendingDeleteId);
    
    if (error) {
        alert('حدث خطأ في الحذف: ' + error.message);
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = 'حذف';
        return;
    }
    
    closeConfirmDeleteModal();
    await fetchTutorials();
    
    const stepsModal = document.getElementById('stepsModal');
    if (stepsModal) stepsModal.classList.remove('open');
}

function initNav() {
    const toggle = document.getElementById('navToggle');
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
    const target = parseInt(el.dataset.target);
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;

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

function initHelpForm() {
    const form = document.getElementById('helpForm');
    const msg = document.getElementById('formMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('visitorName').value.trim();
        const discord = document.getElementById('visitorDiscord').value.trim();
        const details = document.getElementById('requestDetails').value.trim();
        const nsfw = document.getElementById('nsfwCheck').checked;

        if (!name || !details) {
            showMsg(msg, 'يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }
        if (!nsfw) {
            showMsg(msg, 'يجب التأكيد بأن السيرفر Not NSFW', 'error');
            return;
        }

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

        const { error } = await db.from('help_requests').insert([{
            visitor_name: name,
            visitor_discord: discord,
            request_details: details,
            is_nsfw: false
        }]);

        if (error) {
            showMsg(msg, 'حدث خطأ، حاول مرة ثانية', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
            return;
        }

        form.reset();
        btn.innerHTML = '<i class="fas fa-check"></i> تم الإرسال!';
        btn.style.background = '#4ade80';
        btn.style.color = '#000';

        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال الطلب';
            btn.style.background = '';
            btn.style.color = '';
            btn.disabled = false;
        }, 3000);

        showMsg(msg, '✅ تم إرسال طلبك! سيتواصل معك ياسين على الديسكورد قريباً.', 'success');
    });
}

function showMsg(el, text, type) {
    el.textContent = text;
    el.className = `form-message ${type}`;
    setTimeout(() => {
        el.className = 'form-message';
        el.textContent = '';
    }, 5000);
}

function initScrollReveal() {
    const targets = document.querySelectorAll('.section-title, .about-bio, .help-rules, .section-sub');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    targets.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}
