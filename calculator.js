function updateUI() {
    const useBiga = document.getElementById('useBiga').checked;

    // Show/Hide Biga specific settings
    document.getElementById('biga-config').classList.toggle('hidden', !useBiga);
    document.getElementById('phase3-section').classList.toggle('hidden', !useBiga);

    // Update Labels
    document.getElementById('label-p1').textContent = useBiga ? "Phase 1: Biga Temp (°C):" : "Phase 1: Bulk Fermentation Temp (°C):";
    document.getElementById('label-p2').textContent = useBiga ? "Phase 2: Fridge Temp (°C):" : "Phase 2: Final Proof Temp (°C):";

    calculateDough();
}

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
        document.getElementById('results').innerHTML = "Enter all values...";
        return;
    }

    // Recipe Math
    const totalDough = ballW * count;
    const totalFlour = (totalDough / (100 + hydr + salt)) * 100;
    const totalWater = (totalFlour * hydr) / 100;
    const totalSalt = (totalFlour * salt) / 100;

    // Yeast Math
    const baseline = 0.2;
    const getYF = (d, t) => {
        if (d === 0) return 0;
        let factor = (1 + (25 - t) / 10);
        if (t <= 6) factor *= 0.25; // The Fridge Brake
        return (d / 24) * factor;
    };

    const totalYF = getYF(d1, t1) + getYF(d2, t2) + getYF(d3, t3);
    const yeastPercent = baseline / totalYF;
    const yeastNeeded = (totalFlour * yeastPercent) / 100;

    // Output Generation
    let html = `
        <p><strong>Total Flour:</strong> ${totalFlour.toFixed(1)}g</p>
        <p><strong>Total Water:</strong> ${totalWater.toFixed(1)}g</p>
        <p><strong>Instant Yeast:</strong> ${yeastNeeded.toFixed(3)}g</p>
        <p><strong>Salt:</strong> ${totalSalt.toFixed(1)}g</p>
        <hr>
    `;

    if (useBiga) {
        const bigaHydr = parseFloat(document.getElementById('bigaHydration').value);
        const bigaWater = (totalFlour * bigaHydr) / 100;
        html += `
            <h4 style="color:#d9534f">STEP 1: THE BIGA</h4>
            <p>Mix <b>${totalFlour.toFixed(1)}g flour</b>, <b>${bigaWater.toFixed(1)}g water</b>, and all the yeast.</p>
            <h4 style="color:#d9534f">STEP 2: FINAL MIX</h4>
            <p>Add the Biga to <b>${(totalWater - bigaWater).toFixed(1)}g water</b> and <b>${totalSalt.toFixed(2)}g salt</b>.</p>
        `;
    } else {
        html += `<p><b>Direct Method:</b> Mix all ingredients at once.</p>`;
    }

    document.getElementById('results').innerHTML = html;
}