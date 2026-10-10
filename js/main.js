document.addEventListener('DOMContentLoaded', () => {
    // Automatic API Base detection:
    // If opened directly from file explorer (file://), connect to localhost:3000
    // If running on http://localhost:3000 or on Vercel, use relative paths
    const API_BASE = (window.location.protocol === 'file:') ? 'http://localhost:3000' : '';

    // ── Mobile Menu Toggle ──
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.textContent === '☰' ? '✕' : '☰';
            mobileToggle.textContent = icon;
        });
    }

    // Sticky Header Scroll Effect
    const header = document.querySelector('.header-main');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }
        });
    }

    // Close mobile menu when clicking a link
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768 && navLinks) {
                navLinks.classList.remove('active');
                if (mobileToggle) mobileToggle.textContent = '☰';
            }
        });
    });

    // ── Enquiry Form Handling (Database + WhatsApp) ──
    const enquiryForm = document.getElementById('enquiryForm');
    const enquiryNotice = document.getElementById('enquirySuccessNotice');
    const enquirySubmitBtn = document.getElementById('enquirySubmitBtn');

    if (enquiryForm) {
        enquiryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name')?.value || '';
            const phone = document.getElementById('phone')?.value || '';
            const serviceType = document.getElementById('serviceType')?.value || 'General Enquiry';
            const requirement = document.getElementById('requirement')?.value || '';

            if (enquirySubmitBtn) {
                enquirySubmitBtn.disabled = true;
                enquirySubmitBtn.textContent = 'Saving Enquiry...';
            }

            // 1. Save to Database
            let dbSaved = false;
            try {
                const res = await fetch(`${API_BASE}/api/enquiries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        phone,
                        service_type: serviceType,
                        requirement
                    })
                });
                if (res.ok) dbSaved = true;
            } catch (err) {
                console.log('Database error/offline:', err);
            }

            // 2. Show Success Confirmation
            if (enquiryNotice) {
                enquiryNotice.style.display = 'block';
                enquiryNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // 3. Open WhatsApp for instant response
            const message = `Hello Dharmendra ji, New Website Enquiry:%0A%0A*Name:* ${encodeURIComponent(name)}%0A*Phone:* ${encodeURIComponent(phone)}%0A*Category:* ${encodeURIComponent(serviceType)}%0A*Requirement:* ${encodeURIComponent(requirement)}`;
            const whatsappUrl = `https://wa.me/919820490779?text=${message}`;

            window.open(whatsappUrl, '_blank');

            // Reset Form
            setTimeout(() => {
                enquiryForm.reset();
                if (enquirySubmitBtn) {
                    enquirySubmitBtn.disabled = false;
                    enquirySubmitBtn.textContent = 'Submit Enquiry & Chat';
                }
            }, 1200);
        });
    }

    // ── Review Form Handling (Database + Live DOM Update) ──
    const reviewForm = document.getElementById('reviewForm');
    const reviewNotice = document.getElementById('reviewSuccessNotice');
    const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
    const reviewsListContainer = document.getElementById('reviewsListContainer');

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('reviewName')?.value || '';
            const role = document.getElementById('reviewRole')?.value || 'Customer';
            const rating = parseInt(document.getElementById('reviewRating')?.value || '5', 10);
            const message = document.getElementById('reviewMessage')?.value || '';

            if (reviewSubmitBtn) {
                reviewSubmitBtn.disabled = true;
                reviewSubmitBtn.textContent = 'Saving Review to Database...';
            }

            // 1. Save to Backend Database
            let savedSuccess = false;
            try {
                const res = await fetch(`${API_BASE}/api/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        rating,
                        message,
                        role_company: role
                    })
                });
                const data = await res.json();
                if (data.success) {
                    savedSuccess = true;
                }
            } catch (err) {
                console.error('Failed to save review:', err);
            }

            if (savedSuccess) {
                // 2. Prepend review card to list immediately
                if (reviewsListContainer) {
                    const starsText = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                    const newCard = document.createElement('div');
                    newCard.className = 'review-card';
                    newCard.style.border = '2px solid #86efac';
                    newCard.style.animation = 'fadeIn 0.5s ease';
                    newCard.innerHTML = `
                        <div class="stars" style="color:#eab308;">${starsText}</div>
                        <p class="review-text">&ldquo;${escapeHtml(message)}&rdquo;</p>
                        <div class="reviewer-name">- ${escapeHtml(name)} <small style="color:var(--text-light);font-weight:normal;">(${escapeHtml(role)})</small></div>
                    `;
                    reviewsListContainer.prepend(newCard);
                }

                // 3. Show Success Confirmation
                if (reviewNotice) {
                    reviewNotice.style.background = '#dcfce7';
                    reviewNotice.style.borderColor = '#86efac';
                    reviewNotice.style.color = '#166534';
                    reviewNotice.innerHTML = '&#9989; <strong>Thank you!</strong> Your review has been saved in the database and published to the website.';
                    reviewNotice.style.display = 'block';
                    reviewNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }

                reviewForm.reset();
            } else {
                // Notify user of connection issue
                if (reviewNotice) {
                    reviewNotice.style.background = '#fee2e2';
                    reviewNotice.style.borderColor = '#fca5a5';
                    reviewNotice.style.color = '#991b1b';
                    reviewNotice.innerHTML = '❌ <strong>Connection Issue:</strong> Could not connect to the database server. Make sure your server is running (<code>npm start</code>) or open via <a href="http://localhost:3000/reviews.html" style="text-decoration:underline;">http://localhost:3000/reviews.html</a>.';
                    reviewNotice.style.display = 'block';
                    reviewNotice.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }

            // Re-enable button
            if (reviewSubmitBtn) {
                reviewSubmitBtn.disabled = false;
                reviewSubmitBtn.textContent = 'Submit Review';
            }
        });
    }

    // ── Dynamic Reviews loader from API ──
    if (reviewsListContainer) {
        fetch(`${API_BASE}/api/reviews`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    reviewsListContainer.innerHTML = data.data.map(r => {
                        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
                        const roleHtml = r.role_company ? ` <small style="color:var(--text-light);font-weight:normal;">(${escapeHtml(r.role_company)})</small>` : '';
                        return `
                            <div class="review-card">
                                <div class="stars" style="color:#eab308;">${stars}</div>
                                <p class="review-text">&ldquo;${escapeHtml(r.message)}&rdquo;</p>
                                <div class="reviewer-name">- ${escapeHtml(r.name)}${roleHtml}</div>
                            </div>
                        `;
                    }).join('');
                }
            })
            .catch(() => {
                // Keep static HTML fallback if backend is not running
            });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[m]);
    }
});
