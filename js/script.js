const STORAGE_KEY = "forma-health-data-v1";
const CALORIE_GOAL = 2000;
const today = getDateKey(new Date());
let chartRange = 7;

const emptyState = {
    weights: [],
    meals: [],
    workouts: [],
    goalWeight: null,
    goalSpeed: "점진적 감량",
    profile: { heightCm: null, sex: "" }
};
let state = loadState();

function normalizeGoalSpeed(value) {
    if (typeof value !== "string") return "점진적 감량";
    const trimmed = value.trim();
    if (!trimmed) return "점진적 감량";
    if (["점진적 감량", "균형적 감량", "체중 유지", "근육형성"].includes(trimmed)) return trimmed;
    if (trimmed.includes("1개월") || trimmed.includes("3개월") || trimmed.includes("kg") || trimmed.includes("감량")) return "점진적 감량";
    return trimmed;
}

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        return {
            weights: Array.isArray(saved.weights) ? saved.weights : [],
            meals: Array.isArray(saved.meals) ? saved.meals : [],
            workouts: Array.isArray(saved.workouts) ? saved.workouts : [],
            goalWeight: Number.isFinite(Number(saved.goalWeight)) && saved.goalWeight !== null
                ? Number(saved.goalWeight)
                : null,
            goalSpeed: normalizeGoalSpeed(saved.goalSpeed),
            profile: saved.profile && typeof saved.profile === "object"
                ? {
                    heightCm: Number.isFinite(Number(saved.profile.heightCm)) ? Number(saved.profile.heightCm) : null,
                    sex: typeof saved.profile.sex === "string" ? saved.profile.sex : ""
                }
                : { heightCm: null, sex: "" }
        };
    } catch {
        return { ...emptyState };
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch {
        return false;
    }
}

function createId() {
    return globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function calculateBMI(weight, heightCm) {
    if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || heightCm <= 0) return null;
    const heightM = heightCm / 100;
    return weight / (heightM * heightM);
}

function getCurrentBMI() {
    const latestWeight = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    if (!latestWeight || !state.profile.heightCm) return null;
    return calculateBMI(latestWeight.weight, state.profile.heightCm);
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dateOffset(dateKey, offset) {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() + offset);
    return date;
}

function formatNumber(value) {
    return new Intl.NumberFormat("ko-KR").format(value);
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function weekStart(date = new Date()) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
    return start;
}

function thisWeekEntries(entries) {
    const startKey = getDateKey(weekStart());
    return entries.filter(entry => entry.date >= startKey && entry.date <= today);
}

function renderAll() {
    renderDate();
    renderMetrics();
    renderChart();
    renderMeals();
    renderWorkouts();
    renderCalendar();
    renderReport();
}

function renderDate() {
    document.getElementById("today-label").textContent = new Intl.DateTimeFormat("ko-KR", {
        year: "numeric", month: "long", day: "numeric", weekday: "short"
    }).format(new Date());
    document.getElementById("report-period").textContent = "최근 7일";
}

function renderMetrics() {
    const sortedWeights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
    const latestWeight = sortedWeights.at(-1);
    const previousWeight = sortedWeights.at(-2);
    const bmi = getCurrentBMI();
    document.getElementById("current-weight").textContent = latestWeight ? latestWeight.weight.toFixed(1) : "--";
    document.getElementById("weight-change").textContent = previousWeight
        ? `${latestWeight.weight - previousWeight.weight > 0 ? "+" : ""}${(latestWeight.weight - previousWeight.weight).toFixed(1)} kg · 직전 기록 대비`
        : latestWeight ? "첫 체중 기록이 저장됐어요" : "첫 체중을 기록해 보세요";

    document.getElementById("bmi-value").textContent = bmi === null ? "--" : bmi.toFixed(1);
    document.getElementById("bmi-note").textContent = bmi === null
        ? "키/체중 입력 시 계산"
        : bmi < 18.5 ? "저체중 범위" : bmi < 23 ? "정상 범위" : bmi < 25 ? "비만 전 단계" : bmi < 30 ? "비만 1단계" : "고도 비만 범위";

    const todayCalories = state.meals.filter(meal => meal.date === today)
        .reduce((total, meal) => total + meal.calories, 0);
    const caloriesLeft = Math.max(0, CALORIE_GOAL - todayCalories);
    const progress = Math.min(100, (todayCalories / CALORIE_GOAL) * 100);
    document.getElementById("today-calories").textContent = formatNumber(todayCalories);
    document.getElementById("calorie-remaining").textContent = formatNumber(caloriesLeft);
    document.getElementById("calorie-progress").style.width = `${progress}%`;
    document.getElementById("quick-calories").textContent = formatNumber(todayCalories);
    document.getElementById("quick-calorie-progress").style.width = `${progress}%`;

    const workouts = thisWeekEntries(state.workouts);
    const minutes = workouts.reduce((total, workout) => total + workout.minutes, 0);
    document.getElementById("weekly-workouts").textContent = workouts.length;
    document.getElementById("weekly-minutes").textContent = formatNumber(minutes);
    document.getElementById("streak-count").textContent = getStreak();
}

function renderChart() {
    const svg = document.getElementById("weight-chart");
    const empty = document.getElementById("chart-empty");
    const cutoff = dateOffset(today, -(chartRange - 1));
    const cutoffKey = getDateKey(cutoff);
    const points = [...state.weights]
        .filter(item => item.date >= cutoffKey && item.date <= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const latest = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

    const bmiText = latest && state.profile.heightCm
        ? `BMI ${calculateBMI(latest.weight, state.profile.heightCm).toFixed(1)}`
        : "BMI 계산을 위해 키를 추가해 보세요";
    document.getElementById("chart-current").textContent = latest ? `${latest.weight.toFixed(1)} kg` : "기록을 시작해 보세요";
    document.getElementById("chart-goal").textContent = latest && state.goalWeight !== null
        ? `목표 ${state.goalWeight.toFixed(1)} kg · ${Math.abs(latest.weight - state.goalWeight).toFixed(1)} kg 남음 · ${bmiText}`
        : state.goalWeight !== null ? `목표 ${state.goalWeight.toFixed(1)} kg · ${bmiText}` : bmiText;
    document.getElementById("chart-dates").innerHTML = `<span>${cutoffKey.slice(5).replace("-", ".")}</span><span>${today.slice(5).replace("-", ".")}</span>`;

    const grid = [35, 85, 135, 185].map(y => `<line x1="42" y1="${y}" x2="628" y2="${y}" stroke="#2b3830" stroke-width="1"/>`).join("");
    if (!points.length) {
        svg.innerHTML = grid;
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");
    const values = points.map(item => item.weight);
    const min = Math.min(...values, state.goalWeight ?? Infinity) - 1;
    const max = Math.max(...values, state.goalWeight ?? -Infinity) + 1;
    const xAt = date => 42 + (Math.max(0, Math.min(chartRange - 1,
        Math.round((new Date(`${date}T12:00:00`) - cutoff) / 86400000))) / Math.max(1, chartRange - 1)) * 586;
    const yAt = value => 185 - ((value - min) / Math.max(1, max - min)) * 150;
    const path = points.map((point, index) => `${index ? "L" : "M"} ${xAt(point.date)} ${yAt(point.weight)}`).join(" ");
    const dots = points.map(point => `<circle cx="${xAt(point.date)}" cy="${yAt(point.weight)}" r="4" fill="#b7f36b" stroke="#19211d" stroke-width="2"><title>${point.date}: ${point.weight.toFixed(1)} kg</title></circle>`).join("");
    const goalLine = state.goalWeight !== null
        ? `<line x1="42" y1="${yAt(state.goalWeight)}" x2="628" y2="${yAt(state.goalWeight)}" stroke="#ff917a" stroke-dasharray="5 5"/><text x="626" y="${yAt(state.goalWeight) - 5}" fill="#ff917a" text-anchor="end" font-size="9">목표</text>`
        : "";
    svg.innerHTML = `${grid}${goalLine}<path d="${path}" fill="none" stroke="#b7f36b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${dots}`;
}

function renderMeals() {
    const todaysMeals = state.meals.filter(meal => meal.date === today).sort((a, b) => b.createdAt - a.createdAt);
    const total = todaysMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const progress = Math.min(100, (total / CALORIE_GOAL) * 100);
    document.getElementById("meal-count").textContent = `오늘 ${todaysMeals.length}개 기록`;
    document.getElementById("meal-total").textContent = formatNumber(total);
    document.getElementById("meal-progress").style.width = `${progress}%`;
    document.getElementById("meal-goal-note").textContent = total > CALORIE_GOAL
        ? `기준보다 ${formatNumber(total - CALORIE_GOAL)} kcal 더 기록했어요. 필요량은 개인별로 달라요.`
        : `하루 기준 ${formatNumber(CALORIE_GOAL)} kcal · 개인별 필요량은 다를 수 있어요.`;

    document.getElementById("meal-list").innerHTML = todaysMeals.length
        ? todaysMeals.map(meal => `<div class="entry-row"><span class="entry-badge">${escapeHTML(meal.type.slice(0, 1))}</span><span class="entry-copy"><strong>${escapeHTML(meal.name)}</strong><small>${escapeHTML(meal.type)} · 오늘</small></span><span class="entry-value">${formatNumber(meal.calories)} kcal</span><button class="delete-entry" data-kind="meals" data-id="${escapeHTML(meal.id)}" aria-label="${escapeHTML(meal.name)} 삭제">×</button></div>`).join("")
        : "오늘 먹은 음식을 기록해 보세요.";
    document.getElementById("today-meal-preview").innerHTML = todaysMeals.length
        ? todaysMeals.slice(0, 3).map(meal => `<div class="preview-line"><span>${escapeHTML(meal.type)} · ${escapeHTML(meal.name)}</span><span>${formatNumber(meal.calories)} kcal</span></div>`).join("")
        : "아직 기록된 식사가 없어요.";
}

function renderWorkouts() {
    const workouts = [...state.workouts].sort((a, b) => b.createdAt - a.createdAt);
    const weekly = thisWeekEntries(state.workouts);
    const minutes = weekly.reduce((sum, workout) => sum + workout.minutes, 0);
    document.getElementById("workout-count").textContent = `이번 주 ${weekly.length}회`;
    document.getElementById("workout-total-minutes").textContent = formatNumber(minutes);
    document.getElementById("workout-list").innerHTML = workouts.length
        ? workouts.slice(0, 8).map(workout => `<div class="entry-row"><span class="entry-badge">↗</span><span class="entry-copy"><strong>${escapeHTML(workout.name)}</strong><small>${escapeHTML(workout.date)} · 운동</small></span><span class="entry-value">${formatNumber(workout.minutes)}분</span><button class="delete-entry" data-kind="workouts" data-id="${escapeHTML(workout.id)}" aria-label="${escapeHTML(workout.name)} 삭제">×</button></div>`).join("")
        : "운동을 완료한 뒤 기록해 보세요.";
}

function renderCalendar() {
    const end = new Date(`${today}T12:00:00`);
    const first = dateOffset(today, -27);
    const firstOffset = (first.getDay() + 6) % 7;
    const loggedDates = new Set([
        ...state.meals.map(meal => meal.date),
        ...state.workouts.map(workout => workout.date)
    ]);
    const cells = Array.from({ length: firstOffset }, () => "<span></span>");
    for (let date = new Date(first); date <= end; date.setDate(date.getDate() + 1)) {
        const key = getDateKey(date);
        const classes = ["calendar-day", loggedDates.has(key) ? "logged" : "", key === today ? "today" : ""].filter(Boolean).join(" ");
        cells.push(`<span class="${classes}" title="${key}">${date.getDate()}</span>`);
    }
    document.getElementById("habit-calendar").innerHTML = cells.join("");
}

function renderReport() {
    const cutoffKey = getDateKey(dateOffset(today, -6));
    const weekWeights = state.weights.filter(item => item.date >= cutoffKey && item.date <= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const weeklyMeals = state.meals.filter(item => item.date >= cutoffKey && item.date <= today);
    const weeklyWorkouts = thisWeekEntries(state.workouts);
    const minutes = weeklyWorkouts.reduce((sum, workout) => sum + workout.minutes, 0);
    const change = weekWeights.length > 1 ? weekWeights.at(-1).weight - weekWeights[0].weight : null;

    document.getElementById("report-weight").textContent = change === null ? "--" : `${change > 0 ? "+" : ""}${change.toFixed(1)}`;
    document.getElementById("report-weight-note").textContent = change === null
        ? "체중을 2회 이상 기록하면 변화를 보여드려요."
        : `${weekWeights[0].date.slice(5)} → ${weekWeights.at(-1).date.slice(5)} 기준`;
    document.getElementById("report-workouts").textContent = weeklyWorkouts.length;
    document.getElementById("report-minutes").textContent = formatNumber(minutes);
    document.getElementById("report-meals").textContent = weeklyMeals.length;

    let suggestion = "기록을 시작하면 데이터 흐름에 맞춰 실천 가능한 다음 목표를 제안할게요.";
    if (weeklyWorkouts.length >= 3) suggestion = "이번 주에 운동을 꾸준히 기록했어요. 다음 주에도 무리하지 않는 범위에서 현재 리듬을 이어가 보세요.";
    else if (!weeklyWorkouts.length) suggestion = "다음 주에는 가벼운 산책 한 번부터 기록해 보세요. 작은 시작도 충분히 의미 있어요.";
    else if (weeklyMeals.length < 3) suggestion = "식사를 며칠만 더 기록해 보세요. 규칙적인 식사 패턴을 파악하는 데 도움이 됩니다.";
    else suggestion = "식단 기록을 잘 이어가고 있어요. 다음 주에는 편안한 운동을 하루 더 추가해 보는 건 어떨까요?";
    document.getElementById("weekly-suggestion").textContent = suggestion;
}

function getStreak() {
    const logged = new Set([
        ...state.meals.map(meal => meal.date),
        ...state.workouts.map(workout => workout.date)
    ]);
    let cursor = logged.has(today) ? today : getDateKey(dateOffset(today, -1));
    let count = 0;
    while (logged.has(cursor)) {
        count += 1;
        cursor = getDateKey(dateOffset(cursor, -1));
    }
    return count;
}

function getMealPlanProfile(formElement) {
    const profile = Object.fromEntries(new FormData(formElement).entries());
    const height = Number(profile.height || 0);
    const sex = profile.sex || state.profile.sex || "";
    const weight = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight ?? null;
    const bmi = weight !== null && Number.isFinite(height) && height > 0 ? calculateBMI(weight, height) : null;
    return {
        ...profile,
        goalSpeed: normalizeGoalSpeed(state.goalSpeed || "점진적 감량"),
        bmi: bmi === null ? "미입력" : bmi.toFixed(1),
        height: String(height > 0 ? height : state.profile.heightCm ?? ""),
        sex,
        proteinShake: String(profile.proteinShake || "하루 1회")
    };
}

function makeQuickMealFallback(profile) {
    const avoidText = `${profile.avoid || ""} ${(profile.preferences || "")}`.toLowerCase();
    const goalSpeed = normalizeGoalSpeed(String(profile.goalSpeed || state.goalSpeed || "점진적 감량"));
    const sex = String(profile.sex || state.profile.sex || "미상");
    const height = Number(profile.height || state.profile.heightCm || 0);
    const bmi = Number(profile.bmi || 0);
    const proteinShake = String(profile.proteinShake || "하루 1회");
    const baseline = goalSpeed.includes("체중 유지")
        ? "체중 유지 목표로는 에너지 균형을 유지하면서 단백질과 채소 중심으로 하루를 구성하는 것이 가장 안정적"
        : goalSpeed.includes("근육") || goalSpeed.includes("형성")
            ? "근육형성 목표로는 단백질을 충분히 섭취하고, 단백질 쉐이크를 운동 후나 아침에 활용해 영양 균형을 맞추는 쪽이 좋아요"
            : goalSpeed.includes("균형적")
                ? "균형적 감량 목표로는 식사량을 크게 줄이기보다 단백질과 채소를 중심으로 꾸준하게 유지하는 방식이 좋습니다"
                : "점진적 감량 목표로는 가볍게 포만감을 주는 단백질 중심 식사와 하루 1회 단백질 쉐이크를 조합해 꾸준히 이어가는 것이 가장 현실적";
    const shakeNote = /매일|하루/.test(proteinShake)
        ? "하루 1회 단백질 쉐이크는 아침 또는 오후 간식 시간에 넣고, 점심/저녁은 단백질 + 채소 + 복합 탄수화물 중심으로 구성"
        : "단백질 쉐이크는 3~5회/주로 넣어도 되고, 하루 1회만 생활화해도 충분히 보완 가능";
    const meals = {
        "아침": [
            { name: "그릭요거트 + 바나나 + 귀리 + 단백질 쉐이크", tags: ["단백질", "요거트", "바나나", "귀리"] },
            { name: "삶은 달걀 2개 + 현미밥 + 오이샐러드", tags: ["달걀", "쌀", "채소"] },
            { name: "두부 채소 스무디 + 과일", tags: ["두부", "채소", "과일", "단백질"] },
            { name: "닭가슴살 샐러드 + 고구마", tags: ["닭", "채소", "고구마", "단백질"] }
        ],
        "점심": [
            { name: "닭가슴살 현미밥 상차림 + 채소 반찬", tags: ["닭", "쌀", "채소", "단백질"] },
            { name: "연어 샐러드 + 밥 작은 공기", tags: ["연어", "생선", "채소", "쌀"] },
            { name: "두부·채소 덮밥 + 콩나물", tags: ["두부", "콩", "채소", "쌀"] },
            { name: "샐러리 + 닭고기 구이 + 고구마", tags: ["닭", "채소", "고구마", "단백질"] }
        ],
        "저녁": [
            { name: "흰살생선 + 채소찜 + 밥 소량", tags: ["생선", "채소", "쌀", "단백질"] },
            { name: "소고기 채소볶음 + 고구마", tags: ["소고기", "채소", "고구마", "단백질"] },
            { name: "버섯 두부 스튜 + 현미", tags: ["버섯", "두부", "채소", "쌀"] },
            { name: "닭가슴살 샐러드 + 삶은 달걀", tags: ["닭", "달걀", "채소", "단백질"] }
        ]
    };

    const pickedMeals = [];
    const dayLines = Array.from({ length: 7 }, (_, day) => {
        const lines = Object.entries(meals).map(([type, options], mealIndex) => {
            const safe = options.filter(item => !item.tags.some(tag => avoidText.includes(tag.toLowerCase())));
            const choice = safe[(day + mealIndex) % safe.length] || options[(day + mealIndex) % options.length];
            pickedMeals.push(choice.name);
            return `${type}: ${choice.name}`;
        });
        return `${day + 1}일차\n${lines.join("\n")}`;
    });
    const shopping = [...new Set(pickedMeals.join(" ").match(/단백질|요거트|바나나|귀리|달걀|두부|닭가슴살|닭|연어|생선|채소|고구마|버섯|현미|쌀|과일|콩나물|소고기/g) || [])];
    const heightText = height > 0 ? `${height}cm` : "키 입력";
    const bmiText = Number.isFinite(bmi) && bmi > 0 ? `BMI ${bmi.toFixed(1)}` : "BMI 미입력";
    return `7일 기본 예시\n프로필: 성별 ${sex}, 키 ${heightText}, ${bmiText}, 목표 방식 ${goalSpeed}, 단백질 쉐이크 ${proteinShake}\n\n${baseline}\n${shakeNote}\n\n${dayLines.join("\n\n")}\n\n장보기: ${shopping.join(", ")}\n\nGemini 응답 전에 표시되는 기본 예시예요. 단백질 쉐이크는 하루 1회 기준으로 가볍게 배치하고, 알레르기 성분과 제품 표시를 꼭 확인하세요.`;
}

const weightDateInput = document.getElementById("weight-date");
weightDateInput.value = today;
weightDateInput.max = today;

if (state.profile.heightCm) {
    document.getElementById("height-input").value = state.profile.heightCm;
}
if (state.profile.sex) {
    document.getElementById("sex-input").value = state.profile.sex;
}
if (state.goalSpeed) {
    document.getElementById("goal-speed").value = normalizeGoalSpeed(state.goalSpeed);
}

document.getElementById("weight-form").addEventListener("submit", event => {
    event.preventDefault();
    const weight = Number(document.getElementById("weight-input").value);
    const date = weightDateInput.value;
    const goalInput = document.getElementById("goal-weight").value;
    const heightInput = Number(document.getElementById("height-input").value);
    const sexInput = document.getElementById("sex-input").value;
    const speedInput = normalizeGoalSpeed(document.getElementById("goal-speed").value);
    const status = document.getElementById("weight-status");
    if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
        status.textContent = "체중을 20~300 kg 범위에서 입력해 주세요.";
        return;
    }
    if (!date || date > today) {
        status.textContent = "오늘 또는 이전 날짜를 선택해 주세요.";
        return;
    }
    if (document.getElementById("height-input").value && (!Number.isFinite(heightInput) || heightInput < 100 || heightInput > 250)) {
        status.textContent = "키는 100~250 cm 범위에서 입력해 주세요.";
        return;
    }
    const existing = state.weights.findIndex(item => item.date === date);
    const record = { date, weight };
    if (existing >= 0) state.weights[existing] = record;
    else state.weights.push(record);
    if (goalInput) state.goalWeight = Number(goalInput);
    state.goalSpeed = speedInput || state.goalSpeed;
    if (document.getElementById("height-input").value) state.profile.heightCm = heightInput;
    if (sexInput) state.profile.sex = sexInput;
    const saved = saveState();
    status.textContent = saved
        ? `${date} 체중 ${weight.toFixed(1)} kg을 기록했어요. 목표 방식: ${state.goalSpeed}. ${state.profile.heightCm ? `BMI ${calculateBMI(weight, state.profile.heightCm).toFixed(1)}` : "키 정보가 반영됐어요."}`
        : "기록했지만 브라우저 저장이 차단됐어요. localhost에서 열어 주세요.";
    document.getElementById("weight-input").value = "";
    renderAll();
});

document.getElementById("goal-weight").addEventListener("change", event => {
    const goal = Number(event.target.value);
    if (Number.isFinite(goal) && goal >= 20 && goal <= 300) {
        state.goalWeight = goal;
        const saved = saveState();
        document.getElementById("weight-status").textContent = saved
            ? `목표 체중 ${goal.toFixed(1)} kg을 저장했어요.`
            : "목표를 적용했지만 브라우저 저장이 차단됐어요. localhost에서 열어 주세요.";
        renderAll();
    }
});

document.getElementById("meal-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("meal-name").value.trim();
    const calories = Number(document.getElementById("meal-calories").value);
    if (!name || !Number.isInteger(calories) || calories < 0 || calories > 10000) return;
    state.meals.push({
        id: createId(), date: today,
        type: document.getElementById("meal-type").value,
        name, calories, createdAt: Date.now()
    });
    saveState();
    event.currentTarget.reset();
    renderAll();
});

document.getElementById("workout-form").addEventListener("submit", event => {
    event.preventDefault();
    const name = document.getElementById("workout-name").value.trim();
    const minutes = Number(document.getElementById("workout-duration").value);
    if (!name || !Number.isInteger(minutes) || minutes < 1 || minutes > 600) return;
    state.workouts.push({ id: createId(), date: today, name, minutes, createdAt: Date.now() });
    saveState();
    event.currentTarget.reset();
    renderAll();
});

let latestMealPlanPrompt = "";
document.getElementById("meal-plan-form").addEventListener("submit", async event => {
    event.preventDefault();
    const profile = getMealPlanProfile(event.currentTarget);
    latestMealPlanPrompt = Object.entries(profile).filter(([key]) => key !== "consent")
        .map(([key, value]) => `${key}: ${value || "없음"}`).join("\n");
    const status = document.getElementById("meal-plan-status");
    const button = document.getElementById("meal-plan-button");
    button.disabled = true;
    button.textContent = "Gemini가 7일 식단을 만들고 있어요…";
    status.textContent = "기본 7일 예시를 먼저 보여드려요. Gemini에 간단한 식단을 요청하고 있어요.";
    const content = document.getElementById("meal-plan-content");
    content.innerHTML = renderMealPlan(makeQuickMealFallback(profile));
    content.classList.add("ai-plan-rendered");
    content.classList.remove("ai-plan-error");
    document.getElementById("meal-plan-result").classList.add("show");
    try {
        const response = await fetch("/api/meal-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "식단 생성에 실패했어요.");
        content.innerHTML = renderMealPlan(data.plan);
        content.classList.add("ai-plan-rendered");
        status.textContent = "Gemini가 7일 식단을 만들었어요. 알레르기와 제품 표시를 확인해 주세요.";
    } catch (error) {
        const message = error.message || "서버에 연결할 수 없어요. 실행 안내를 확인해 주세요.";
        status.textContent = `Gemini 응답이 지연되어 기본 7일 예시를 표시했어요. ${message}`;
    } finally {
        button.disabled = false;
        button.innerHTML = 'Gemini로 7일 식단 만들기 <span>✳</span>';
    }
    document.getElementById("meal-plan-result").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("copy-plan-prompt").addEventListener("click", async event => {
    const status = document.getElementById("copy-plan-status");
    try {
        await navigator.clipboard.writeText(latestMealPlanPrompt);
        status.textContent = "입력 정보 복사 완료";
    } catch {
        status.textContent = "복사할 수 없어요. HTTPS 또는 localhost에서 시도해 주세요.";
    }
});

document.addEventListener("click", event => {
    const deleteButton = event.target.closest(".delete-entry");
    if (deleteButton) {
        const collection = deleteButton.dataset.kind;
        state[collection] = state[collection].filter(entry => entry.id !== deleteButton.dataset.id);
        saveState();
        renderAll();
        return;
    }

    const rangeButton = event.target.closest(".range-button");
    if (rangeButton) {
        chartRange = Number(rangeButton.dataset.range);
        document.querySelectorAll(".range-button").forEach(button => button.classList.toggle("active", button === rangeButton));
        renderChart();
    }

    const navLink = event.target.closest(".nav-link");
    if (navLink) {
        document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link === navLink));
    }
});

document.getElementById("exercise-form").addEventListener("submit", event => {
    event.preventDefault();
    const goal = document.getElementById("exercise-goal").value;
    const level = document.getElementById("exercise-level").value;
    const time = document.getElementById("exercise-time").value;
    const place = document.getElementById("exercise-place").value;
    let exercises;

    if (place === "집") exercises = ["제자리 걷기 또는 가볍게 걷기", "의자에 앉았다 일어나기", "벽을 이용한 팔굽혀펴기", "가벼운 전신 스트레칭"];
    else if (place === "헬스장") exercises = ["가벼운 유산소 운동", "레그 프레스 또는 맨몸 스쿼트", "시티드 로우", "가벼운 마무리 스트레칭"];
    else exercises = ["편안한 속도로 걷기", "가능한 범위에서 빠르게 걷기", "잠깐 휴식하며 수분 섭취하기", "가벼운 마무리 스트레칭"];

    const durations = time === "20분" ? ["5분", "5분", "5분", "5분"]
        : time === "30분" ? ["5분", "10분", "10분", "5분"]
            : ["10분", "20분", "20분", "10분"];
    document.getElementById("exercise-result-content").innerHTML = `
        <p><strong>운동 목표:</strong> ${escapeHTML(goal)}</p>
        <p><strong>운동 경험:</strong> ${escapeHTML(level)}</p>
        <p><strong>장소:</strong> ${escapeHTML(place)}</p>
        <p><strong>총 운동 시간:</strong> ${escapeHTML(time)}</p>
        <h4>오늘의 운동 순서</h4>
        <ol>${exercises.map((exercise, index) => `<li>${escapeHTML(exercise)} · ${durations[index]}</li>`).join("")}</ol>
        <p>처음에는 편안한 강도로 시작하고, 통증이나 어지러움이 생기면 운동을 중단하세요.</p>
        <p><em>이 운동 계획은 입력 정보를 바탕으로 만든 기본 예시이며, AI가 생성한 결과는 아닙니다.</em></p>`;
    document.getElementById("exercise-result").classList.add("show");
    document.getElementById("exercise-status").textContent = "운동 계획이 준비되었습니다.";
    document.getElementById("exercise-result").scrollIntoView({ behavior: "smooth", block: "start" });
});

renderAll();
