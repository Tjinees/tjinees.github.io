(function () {
    const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    const state = {
        useBiga: false,
        useDirectFridge: false,
        yeastType: 'idy',
        selectedDay: 5, // Saturday
        phases: {
            directRt: { temp2: 21, dur2: 24 },
            directCold: { temp1: 4, dur1: 24, temp2: 21, dur2: 8 },
            biga: { temp1: 21, dur1: 12, temp2: 4, dur2: 24, temp3: 21, dur3: 8 }
        }
    };

    const el = (id) => document.getElementById(id);

    function readNumber(id) {
        return parseFloat(el(id).value);
    }

    function getPhaseKey() {
        if (state.useBiga) return 'biga';
        return state.useDirectFridge ? 'directCold' : 'directRt';
    }

    function saveCurrentPhaseInputs() {
        const key = getPhaseKey();
        const target = state.phases[key];
        target.temp2 = el('temp2').value;
        target.dur2 = el('dur2').value;
        if (key !== 'directRt') {
            target.temp1 = el('temp1').value;
            target.dur1 = el('dur1').value;
        }
        if (key === 'biga') {
            target.temp3 = el('temp3').value;
            target.dur3 = el('dur3').value;
        }
    }

    function applyPhaseInputs() {
        const key = getPhaseKey();
        const source = state.phases[key];
        el('temp2').value = source.temp2;
        el('dur2').value = source.dur2;
        if (key !== 'directRt') {
            el('temp1').value = source.temp1;
            el('dur1').value = source.dur1;
        }
        if (key === 'biga') {
            el('temp3').value = source.temp3;
            el('dur3').value = source.dur3;
        }
    }

    function chip(label, val, unit, span = '') {
        return `
            <div class="r-chip ${span}">
                <div class="r-chip-label">${label}</div>
                <div class="r-chip-val">${val}<span class="u">${unit}</span></div>
            </div>`;
    }

    function formatCompactNumber(n) {
        const rounded = Math.round(n * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    function renderResults(result, ballCount, ballWeight) {
        const container = el('results');
        const summaryEl = el('recipeSummary');

        if (result.error) {
            summaryEl.textContent = '';
            container.innerHTML = `<div class="r-error">${result.error}</div>`;
            return;
        }

        summaryEl.textContent = `${Math.round(result.totalDough)}g · ${formatCompactNumber(ballCount)} × ${formatCompactNumber(ballWeight)}g`;

        const yeastHeading = `Yeast (${result.yeastLabel})`;
        let html = '<div class="results-body">';

        if (result.useBiga) {
            html += `
                <div class="r-group-label">Step 1 — Biga</div>
                <div class="r-chips">
                    ${chip('Flour', result.biga.flour.toFixed(1), 'g')}
                    ${chip('Water', result.biga.water.toFixed(1), 'g')}
                    ${chip(yeastHeading, result.yeastGrams.toFixed(2), 'g', 'span2')}
                </div>
                <div class="r-divider"></div>
                <div class="r-group-label">Step 2 — Final mix</div>
                <div class="r-chips">
                    ${chip('Flour', result.biga.remFlour.toFixed(1), 'g')}
                    ${chip('Water', result.biga.remWater.toFixed(1), 'g')}
                    ${chip('Salt', result.totalSalt.toFixed(1), 'g', 'span2')}
                </div>`;
        } else {
            html += `
                <div class="r-group-label">Ingredients</div>
                <div class="r-chips">
                    ${chip('Flour', result.totalFlour.toFixed(1), 'g')}
                    ${chip('Water', result.totalWater.toFixed(1), 'g')}
                    ${chip('Salt', result.totalSalt.toFixed(1), 'g')}
                    ${chip(yeastHeading, result.yeastGrams.toFixed(2), 'g')}
                </div>`;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    function updateStartTime() {
        const showPhase1 = state.useBiga || state.useDirectFridge;
        const d1 = showPhase1 ? (readNumber('dur1') || 0) : 0;
        const d2 = readNumber('dur2') || 0;
        const d3 = state.useBiga ? (readNumber('dur3') || 0) : 0;
        const hour = parseInt(el('pizzaHour').value, 10);

        const schedule = window.DoughSchedule.computeStartTime({
            dayIndex: state.selectedDay,
            hour,
            totalHours: Math.max(0, d1) + Math.max(0, d2) + Math.max(0, d3)
        });

        const valueEl = el('startValue');
        const subEl = el('startSub');

        valueEl.textContent = schedule.formattedTime;
        valueEl.classList.toggle('is-past', schedule.isPast);

        subEl.textContent = schedule.isPast
            ? `Start time passed · ${schedule.formattedDuration}`
            : schedule.formattedDuration;
        subEl.classList.toggle('is-past', schedule.isPast);
    }

    function recalculate() {
        saveCurrentPhaseInputs();

        const ballWeight = readNumber('ballWeight');
        const ballCount = readNumber('ballCount');
        const usePhase1 = state.useBiga || state.useDirectFridge;

        const result = window.DoughCalculator.calculateRecipe({
            useBiga: state.useBiga,
            ballWeight,
            ballCount,
            hydration: readNumber('hydration'),
            salt: readNumber('salt'),
            bigaPercent: readNumber('bigaPercent'),
            bigaHydration: readNumber('bigaHydration'),
            temp1: usePhase1 ? readNumber('temp1') : 4,
            dur1: usePhase1 ? readNumber('dur1') : 0,
            temp2: readNumber('temp2'),
            dur2: readNumber('dur2'),
            temp3: readNumber('temp3'),
            dur3: readNumber('dur3'),
            yeastType: state.yeastType
        });

        renderResults(result, ballCount, ballWeight);
        updateStartTime();
    }

    function updateFermentationUI() {
        const biga = state.useBiga;
        const directFridge = !biga && state.useDirectFridge;

        el('seg-direct').classList.toggle('active', !biga);
        el('seg-direct').setAttribute('aria-pressed', String(!biga));
        el('seg-biga').classList.toggle('active', biga);
        el('seg-biga').setAttribute('aria-pressed', String(biga));

        el('biga-config').classList.toggle('hidden', !biga);
        el('direct-fridge-toggle').classList.toggle('hidden', biga);

        el('seg-rt').classList.toggle('active', !state.useDirectFridge);
        el('seg-rt').setAttribute('aria-pressed', String(!state.useDirectFridge));
        el('seg-fridge').classList.toggle('active', state.useDirectFridge);
        el('seg-fridge').setAttribute('aria-pressed', String(state.useDirectFridge));

        el('phase1-section').classList.toggle('hidden', !biga && !directFridge);
        el('phase3-section').classList.toggle('hidden', !biga);

        const pip1 = el('pip-p1');
        const pip2 = el('pip-p2');

        if (biga) {
            el('label-p1').textContent = 'Phase 1 — Biga';
            el('label-p2').textContent = 'Phase 2 — Fridge';
            pip1.className = 'phase-pip';
            pip2.className = 'phase-pip c2';
        } else if (directFridge) {
            el('label-p1').textContent = 'Phase 1 — Fridge';
            el('label-p2').textContent = 'Phase 2 — Final Proof';
            pip1.className = 'phase-pip c2';
            pip2.className = 'phase-pip c3';
        } else {
            el('label-p2').textContent = 'Room Temp';
            pip2.className = 'phase-pip c3';
        }

        applyPhaseInputs();
        recalculate();
    }

    function setMethod(bigaOn) {
        if (state.useBiga === bigaOn) return;
        saveCurrentPhaseInputs();
        state.useBiga = bigaOn;
        updateFermentationUI();
    }

    function setDirectFridge(fridgeOn) {
        if (state.useDirectFridge === fridgeOn) return;
        saveCurrentPhaseInputs();
        state.useDirectFridge = fridgeOn;
        updateFermentationUI();
    }

    function setYeastType(type) {
        state.yeastType = type;
        document.querySelectorAll('#yeastTypeControl .seg-btn').forEach((btn) => {
            const active = btn.dataset.yeast === type;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', String(active));
        });
        recalculate();
    }

    function initDayStrip() {
        const strip = el('dayStrip');
        strip.innerHTML = '';
        DAYS.forEach((day, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'day-btn' + (index === state.selectedDay ? ' active' : '');
            btn.setAttribute('aria-pressed', String(index === state.selectedDay));
            btn.textContent = day;
            btn.addEventListener('click', () => {
                state.selectedDay = index;
                strip.querySelectorAll('.day-btn').forEach((b, i) => {
                    const active = i === index;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-pressed', String(active));
                });
                updateStartTime();
            });
            strip.appendChild(btn);
        });
    }

    function initHourDropdown() {
        const sel = el('pizzaHour');
        for (let h = 0; h < 24; h++) {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = String(h).padStart(2, '0') + ':00';
            if (h === 17) opt.selected = true;
            sel.appendChild(opt);
        }
        sel.addEventListener('change', updateStartTime);
    }

    function bindEvents() {
        el('seg-direct').addEventListener('click', () => setMethod(false));
        el('seg-biga').addEventListener('click', () => setMethod(true));
        el('seg-rt').addEventListener('click', () => setDirectFridge(false));
        el('seg-fridge').addEventListener('click', () => setDirectFridge(true));

        document.querySelectorAll('#yeastTypeControl .seg-btn').forEach((btn) => {
            btn.addEventListener('click', () => setYeastType(btn.dataset.yeast));
        });

        const numericInputs = [
            'ballWeight', 'ballCount', 'hydration', 'salt',
            'bigaPercent', 'bigaHydration',
            'temp1', 'dur1', 'temp2', 'dur2', 'temp3', 'dur3'
        ];
        numericInputs.forEach((id) => {
            el(id).addEventListener('input', recalculate);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        initDayStrip();
        initHourDropdown();
        bindEvents();
        updateFermentationUI();
    });
})();
