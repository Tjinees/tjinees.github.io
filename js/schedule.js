(function (root) {
    const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    /**
     * Returns the next Date for the given weekday index (0=Mo … 6=Su) at the given hour.
     */
    function nextOccurrence(dayIndex, hour, now = new Date()) {
        const jsDay = (dayIndex + 1) % 7; // Mo=1 … Su=0 in JS
        const target = new Date(now);
        target.setHours(hour, 0, 0, 0);

        let diff = (jsDay - now.getDay() + 7) % 7;
        if (diff === 0 && target <= now) {
            diff = 7; // Same day, time has passed -> next week
        }
        target.setDate(target.getDate() + diff);
        return target;
    }

    /**
     * Formats a number of hours cleanly (e.g. 44 -> "44", 12.5 -> "12.5").
     */
    function formatHours(hours) {
        const rounded = Math.round(hours * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    /**
     * Computes when to start making dough given target pizza day/hour and total fermentation hours.
     */
    function computeStartTime({ dayIndex, hour, totalHours, now = new Date() }) {
        const safeHours = Math.max(0, Number.isFinite(totalHours) ? totalHours : 0);
        const pizzaTime = nextOccurrence(dayIndex, hour, now);
        const startTime = new Date(pizzaTime.getTime() - safeHours * 60 * 60 * 1000);
        const isPast = startTime.getTime() < now.getTime();

        const startDay = DAY_SHORT[startTime.getDay()];
        const hh = String(startTime.getHours()).padStart(2, '0');
        const mm = String(startTime.getMinutes()).padStart(2, '0');

        return {
            pizzaTime,
            startTime,
            isPast,
            totalHours: safeHours,
            formattedTime: `${startDay} · ${hh}:${mm}`,
            formattedDuration: `${formatHours(safeHours)}h before pizza time`
        };
    }

    const api = {
        nextOccurrence,
        computeStartTime,
        formatHours
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.DoughSchedule = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
