/**
 * TravelMate AI Planner UI Renderer (js/ai-planner-ui.js)
 * Consumes structured JSON from ai-planner-engine.js and renders interactive
 * travel planning components, budget matrices, timeline cards, & safety panels.
 */

class TravelMateAiPlannerUi {
    constructor() {
        this.engine = window.aiPlannerEngine;
    }

    /**
     * Shows the main AI Professional Planner Modal for the current trip.
     */
    async openPlannerModal(trip) {
        if (!trip) {
            showToast('Please select a trip first.', 'warning');
            return;
        }

        const modalEl = document.getElementById('professionalAiPlannerModal');
        if (!modalEl) {
            console.error('professionalAiPlannerModal not found in DOM.');
            return;
        }

        const containerEl = document.getElementById('ai-planner-content-container');
        const loadingEl = document.getElementById('ai-planner-loading-spinner');

        if (loadingEl) loadingEl.classList.remove('d-none');
        if (containerEl) containerEl.classList.add('d-none');

        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const plan = await this.engine.generateProfessionalPlan(trip);
            this.renderPlanIntoContainer(plan, containerEl);
        } catch (err) {
            console.error('Failed to generate AI plan:', err);
            showToast('Error generating AI plan', 'danger');
        } finally {
            if (loadingEl) loadingEl.classList.add('d-none');
            if (containerEl) containerEl.classList.remove('d-none');
        }
    }

    /**
     * Renders the complete structured JSON plan object into HTML DOM.
     */
    renderPlanIntoContainer(plan, container) {
        if (!container || !plan) return;

        let html = `
            <!-- Executive Summary Card -->
            <div class="card border-0 shadow-sm rounded-4 mb-4 bg-gradient text-white" style="background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);">
                <div class="card-body p-4">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <span class="badge bg-warning text-dark fw-bold px-3 py-1.5 rounded-pill"><i class="fas fa-robot me-1"></i>TravelMate AI Engine v2.0</span>
                        <small class="text-white-50"><i class="fas fa-clock me-1"></i>${new Date(plan.meta.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</small>
                    </div>
                    <h4 class="fw-bold mb-1"><i class="fas fa-compass me-2 text-warning"></i>${plan.summary.title}</h4>
                    <div class="d-flex flex-wrap gap-3 small text-white-50 mt-2">
                        <div><i class="fas fa-hiking me-1 text-warning"></i>Pace: <strong class="text-white">${plan.summary.pace}</strong></div>
                        <div><i class="fas fa-utensils me-1 text-warning"></i>Diet: <strong class="text-white">${plan.summary.dietaryFocus}</strong></div>
                        <div><i class="fas fa-train me-1 text-warning"></i>Transport: <strong class="text-white">${plan.summary.travelMode}</strong></div>
                    </div>
                </div>
            </div>

            <!-- Multi-City Journey Stages Banner -->
            <div class="mb-4">
                <h6 class="fw-bold text-dark mb-2"><i class="fas fa-route text-primary me-2"></i>Multi-City Journey Milestone Stages</h6>
                <div class="d-flex flex-nowrap overflow-x-auto gap-2 pb-2">
                    ${plan.journeyStages.map(s => `
                        <div class="p-2.5 border rounded-3 bg-white shadow-sm flex-shrink-0" style="min-width:180px;">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="badge bg-primary text-white">Day ${s.day}</span>
                                <small class="text-muted">${s.dateStr.split(',')[0]}</small>
                            </div>
                            <div class="fw-bold text-dark text-truncate small"><i class="fas fa-map-marker-alt text-danger me-1"></i>${s.city}</div>
                            <div class="text-muted" style="font-size:0.75rem;">
                                ${s.arrival ? `🛬 ${s.arrival.time}` : ''}
                                ${s.departure ? `🛫 ${s.departure.time}` : ''}
                                ${s.isOnboardTransit ? '🚂 Onboard Transit' : ''}
                                ${!s.arrival && !s.departure && !s.isOnboardTransit ? '🏛️ City Sightseeing' : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Day-by-Day Detailed Schedule -->
            <div class="mb-4">
                <h6 class="fw-bold text-dark mb-3"><i class="fas fa-calendar-alt text-success me-2"></i>Optimized Day-by-Day Schedule</h6>
                <div class="vstack gap-3">
                    ${plan.daySchedule.map(day => `
                        <div class="card border-0 shadow-sm rounded-3 overflow-hidden">
                            <div class="card-header bg-light border-0 py-2.5 px-3 d-flex align-items-center justify-content-between">
                                <span class="fw-bold text-dark"><i class="far fa-calendar-check text-success me-2"></i>Day ${day.day} — ${day.dateStr} (${day.city})</span>
                                <span class="badge bg-success-subtle text-success border border-success-subtle"><i class="fas fa-clock me-1"></i>Free Window: ${day.freeWindow}</span>
                            </div>
                            <div class="card-body p-3">
                                <div class="vstack gap-2">
                                    ${day.activities.map(a => `
                                        <div class="p-2.5 border rounded-3 bg-white d-flex align-items-start justify-content-between">
                                            <div class="d-flex align-items-start me-2">
                                                <span class="badge bg-secondary me-2.5 px-2 py-1 fw-bold" style="font-size:0.8rem;">${a.time}</span>
                                                <div>
                                                    <div class="fw-bold text-dark small">${a.title}</div>
                                                    <div class="text-muted" style="font-size:0.75rem;">${a.notes}</div>
                                                    ${a.pilgrimageInfo ? `
                                                        <div class="mt-1.5 p-2 bg-warning-subtle text-dark border border-warning-subtle rounded-3 small">
                                                            <div><strong>🕉️ Darshan Details:</strong> Dress Code: ${a.pilgrimageInfo.dressCode} | Prasadam: ${a.pilgrimageInfo.prasadam}</div>
                                                            <div>Footwear: ${a.pilgrimageInfo.footwearStand} | Lockers: ${a.pilgrimageInfo.lockerAvailable}</div>
                                                        </div>
                                                    ` : ''}
                                                    ${a.nearbyThali ? `<div class="mt-1 text-danger small"><i class="fas fa-utensils me-1"></i>Recommended Dining: <strong>${a.nearbyThali}</strong></div>` : ''}
                                                </div>
                                            </div>
                                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${(a.category || 'spot').toUpperCase()}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Smart Budget Comparison Matrix -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-header bg-white border-0 py-3 px-4">
                    <h6 class="fw-bold text-dark mb-0"><i class="fas fa-wallet text-warning me-2"></i>Smart Budget Engine Tiers</h6>
                </div>
                <div class="card-body p-4 pt-0">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="p-3 border rounded-3 bg-light text-center h-100">
                                <div class="badge bg-secondary mb-2">LOW BUDGET</div>
                                <h4 class="fw-bold text-dark mb-1">${plan.budgetMatrix.lowTier.totalAmount}</h4>
                                <div class="small text-muted">Hotel: ${plan.budgetMatrix.lowTier.hotelCost} | Food: ${plan.budgetMatrix.lowTier.foodCost}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border border-warning rounded-3 bg-warning-subtle text-center h-100 shadow-sm">
                                <div class="badge bg-warning text-dark fw-bold mb-2">RECOMMENDED</div>
                                <h4 class="fw-bold text-dark mb-1">${plan.budgetMatrix.mediumTier.totalAmount}</h4>
                                <div class="small text-dark">Hotel: ${plan.budgetMatrix.mediumTier.hotelCost} | Food: ${plan.budgetMatrix.mediumTier.foodCost}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="p-3 border rounded-3 bg-light text-center h-100">
                                <div class="badge bg-dark mb-2">PREMIUM LUXURY</div>
                                <h4 class="fw-bold text-dark mb-1">${plan.budgetMatrix.premiumTier.totalAmount}</h4>
                                <div class="small text-muted">Hotel: ${plan.budgetMatrix.premiumTier.hotelCost} | Food: ${plan.budgetMatrix.premiumTier.foodCost}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Packing & Emergency Contacts -->
            <div class="row g-3 mb-2">
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h6 class="fw-bold text-dark mb-0"><i class="fas fa-suitcase text-success me-2"></i>Packing & Safety List</h6>
                        </div>
                        <div class="card-body p-4 pt-0">
                            <ul class="list-group list-group-flush small">
                                ${plan.packingList.map(item => `<li class="list-group-item px-0 py-1.5 border-0"><i class="fas fa-check-circle text-success me-2"></i>${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h6 class="fw-bold text-dark mb-0"><i class="fas fa-shield-alt text-danger me-2"></i>Emergency Helplines</h6>
                        </div>
                        <div class="card-body p-4 pt-0">
                            <div class="vstack gap-2">
                                ${plan.emergencyContacts.map(c => `
                                    <div class="d-flex justify-content-between align-items-center p-2 bg-light rounded-3 small">
                                        <span class="fw-semibold text-dark">${c.service}</span>
                                        <a href="tel:${c.number}" class="badge bg-danger text-white text-decoration-none px-2.5 py-1.5 fw-bold"><i class="fas fa-phone-alt me-1"></i>${c.number}</a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }
}

window.aiPlannerUi = new TravelMateAiPlannerUi();
