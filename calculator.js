function calculateDough() {
    const useBiga = document.getElementById('useBiga').checked;

    // Get values
    const ballW = parseFloat(document.getElementById('ballWeight').value);
    const count = parseFloat(document.getElementById('ballCount').value);
    const hydr = parseFloat(document.getElementById('hydration').value);
    const salt = parseFloat(document.getElementById('salt').value);

    // Temps and Durations
    const t1 = parseFloat(document.getElementById('temp1').value);
    const d1 = parseFloat(document.getElementById('dur1').value);
    const t2 = parseFloat(document.getElementById('temp2').value);
    const d2 = parseFloat(document.getElementById('dur2').value);

    // Optional Phase 3
    const t3 = useBiga ? parseFloat(document.getElementById('temp3').value) : 0;
    const d3 = useBiga ? parseFloat(document.getElementById('dur3').value) : 0;

    // Basic Validation
    if ([ballW, count, hydr, salt, t1, d1, t2, d2].some(isNaN)) {
        document.getElementById('results').innerHTML = "<div class='r-group-label'>Enter all values...</div>";
        return;
    }

    // Recipe Math
    const totalDough = ballW * count;
    const totalFlour = (totalDough / (100 + hydr + salt)) * 100;
    const totalWater = (totalFlour * hydr) / 100;
    const totalSalt = (totalFlour * salt) / 100;

    // --- FERMENTATIE MODEL (Equivalent Hours bij 21°C) ---
    // Rekent alle uren bij temperatuur T om naar equivalente uren op kamertemperatuur (21°C)
    const getEquivalentHours = (hours, temp, isColdPhase = false, isDirectStart = false) => {
        if (hours <= 0) return 0;

        // Direct deeg gaat warm de koelkast in -> 3 uur afkoelfase (gemiddeld 12.5°C)
        if (isColdPhase && isDirectStart) {
            const coolHours = Math.min(3, hours);
            const coldHours = Math.max(0, hours - coolHours);
            const avgCoolTemp = (21 + temp) / 2;

            const coolEq = coolHours * Math.pow(2, (avgCoolTemp - 21) / 6);
            const coldEq = coldHours * Math.pow(2, (temp - 21) / 6);
            return coolEq + coldEq;
        }

        // Standaard gist-curve (halveert/verdubbelt elke ~6°C)
        return hours * Math.pow(2, (temp - 21) / 6);
    };

    let totalEqHours = 0;
    let baseFactor;

    if (useBiga) {
        // BIGA METHODE
        // Biga start met weinig gist, dus de gewogen rijsversnelling ligt lager.
        // Factor 0.7 geeft de perfecte gistdosis voor een 8u tot 16u Biga.
        const eq1 = getEquivalentHours(d1, t1) * 0.7; 
        const eq2 = getEquivalentHours(d2, t2);
        const eq3 = getEquivalentHours(d3, t3);
        totalEqHours = eq1 + eq2 + eq3;
        baseFactor = 0.85;
    } else {
        // DIRECT DEEG METHODE
        const eq1 = getEquivalentHours(d1, t1, t1 <= 10, true); // Phase 1 is Koelkast
        const eq2 = getEquivalentHours(d2, t2); // Phase 2 is Kamertemp
        totalEqHours = eq1 + eq2;
        baseFactor = 0.84;
    }

    totalEqHours = Math.max(0.5, totalEqHours);

    // Formule voor Caputo Droge Gist (IDY) gebaseerd op totale equivalente uren
    const yeastPercent = baseFactor / totalEqHours;
    // const yeastPercent = 0.90 / totalEqHours;
    const yeastNeeded = (totalFlour * yeastPercent) / 100;

    // Output Generation
    const chip = (label, val, unit, span='') => `
      <div class="r-chip ${span}">
        <div class="r-chip-label">${label}</div>
        <div class="r-chip-val">${val}<span class="u">${unit}</span></div>
      </div>`;

    let html = `<div class="results-body">`;

    if (useBiga) {
        const bigaPercent = parseFloat(document.getElementById('bigaPercent').value);
        const bigaHydr = parseFloat(document.getElementById('bigaHydration').value);
        const bigaFlour = (totalFlour * bigaPercent) / 100;
        const remFlour  = totalFlour - bigaFlour;
        const bigaWater = (bigaFlour * bigaHydr) / 100;
        const remWater  = totalWater - bigaWater;
        html += `
            <div class="r-group-label">Step 1 — Biga</div>
            <div class="r-chips">
              ${chip('Flour', bigaFlour.toFixed(1), 'g')}
              ${chip('Water', bigaWater.toFixed(1), 'g')}
              ${chip('Yeast', yeastNeeded.toFixed(2), 'g', 'span2')}
            </div>
            <div class="r-divider"></div>
            <div class="r-group-label">Step 2 — Final mix</div>
            <div class="r-chips">
              ${chip('Flour', remFlour.toFixed(1), 'g')}
              ${chip('Water', remWater.toFixed(1), 'g')}
              ${chip('Salt', totalSalt.toFixed(1), 'g')}
            </div>`;
    } else {
        html += `
            <div class="r-group-label">Ingredients</div>
            <div class="r-chips">
              ${chip('Flour', totalFlour.toFixed(1), 'g')}
              ${chip('Water', totalWater.toFixed(1), 'g')}
              ${chip('Salt', totalSalt.toFixed(1), 'g')}
              ${chip('Yeast', yeastNeeded.toFixed(2), 'g')}
            </div>`;
    }

    html += `</div>`;
    document.getElementById('results').innerHTML = html;

    // Update start time banner
    if (typeof calculateStartTime === 'function') {
        calculateStartTime();
    }
}