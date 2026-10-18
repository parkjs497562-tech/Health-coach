
const dietForm = document.getElementById("diet-form");
const dietButton = document.getElementById("diet-button");
const dietStatus = document.getElementById("diet-status");
const dietResult = document.getElementById("diet-result");
const dietResultContent = document.getElementById("diet-result-content");

const exerciseForm = document.getElementById("exercise-form");
const exerciseButton = document.getElementById("exercise-button");
const exerciseStatus = document.getElementById("exercise-status");
const exerciseResult = document.getElementById("exercise-result");
const exerciseResultContent = document.getElementById("exercise-result-content");

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[character];
    });
}

function formatText(text) {
    return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}

// 식단 추천: 백엔드 API에 요청
dietForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const goal = document.getElementById("diet-goal").value;
    const food = document.getElementById("diet-food").value.trim();
    const dislike = document.getElementById("diet-dislike").value.trim();
    const meals = document.getElementById("diet-meals").value;

    if (!goal || !food || !meals) {
        dietStatus.textContent = "필수 정보를 모두 입력해 주세요.";
        return;
    }

    dietButton.disabled = true;
    dietButton.textContent = "AI가 식단을 만드는 중...";
    dietStatus.textContent = "잠시만 기다려 주세요.";
    dietResult.classList.remove("show");
    dietResultContent.textContent = "";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch("/api/diet", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                goal: goal,
                food: food,
                dislike: dislike,
                meals: meals
            }),
            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "식단 추천에 실패했습니다.");
        }

        dietResultContent.innerHTML = formatText(data.result);
        dietResult.classList.add("show");
        dietStatus.textContent = "맞춤 식단 추천이 완료되었습니다.";

        dietResult.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        if (error.name === "AbortError") {
            dietStatus.textContent =
                "요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.";
        } else {
            dietStatus.textContent =
                error.message ||
                "서버에 연결하지 못했어요. 배포 및 API 설정을 확인해 주세요.";
        }
    } finally {
        clearTimeout(timeoutId);
        dietButton.disabled = false;
        dietButton.textContent = "AI 식단 추천받기";
    }
});

// 운동 추천: 브라우저에서 계획 생성
exerciseForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const goal = document.getElementById("exercise-goal").value;
    const level = document.getElementById("exercise-level").value;
    const time = document.getElementById("exercise-time").value;
    const place = document.getElementById("exercise-place").value;

    if (!goal || !level || !time || !place) {
        exerciseStatus.textContent = "모든 항목을 선택해 주세요.";
        return;
    }

    let exercises;

    if (place === "집") {
        exercises = [
            "제자리 걷기 또는 가볍게 걷기",
            "의자에 앉았다 일어나기",
            "벽을 이용한 팔굽혀펴기",
            "가벼운 전신 스트레칭"
        ];
    } else if (place === "헬스장") {
        exercises = [
            "가벼운 유산소 운동",
            "레그 프레스 또는 맨몸 스쿼트",
            "시티드 로우",
            "가벼운 마무리 스트레칭"
        ];
    } else {
        exercises = [
            "편안한 속도로 걷기",
            "가능한 범위에서 빠르게 걷기",
            "잠깐 휴식하며 수분 섭취하기",
            "가벼운 마무리 스트레칭"
        ];
    }

    let duration;

    if (time === "20분") {
        duration = ["5분", "5분", "5분", "5분"];
    } else if (time === "30분") {
        duration = ["5분", "10분", "10분", "5분"];
    } else {
        duration = ["10분", "20분", "20분", "10분"];
    }

    exerciseResultContent.innerHTML = `
        <p><strong>운동 목표:</strong> ${escapeHTML(goal)}</p>
        <p><strong>운동 경험:</strong> ${escapeHTML(level)}</p>
        <p><strong>장소:</strong> ${escapeHTML(place)}</p>
        <p><strong>총 운동 시간:</strong> ${escapeHTML(time)}</p>
        <h4>오늘의 운동 순서</h4>
        <ol>
            ${exercises.map((exercise, index) => `
                <li>${escapeHTML(exercise)} — ${duration[index]}</li>
            `).join("")}
        </ol>
        <p>처음에는 편안한 강도로 시작하고, 통증이나 어지러움이 생기면 운동을 중단하세요.</p>
        <p><em>이 운동 계획은 입력 정보를 바탕으로 만든 기본 예시이며, AI가 생성한 결과는 아닙니다.</em></p>
    `;

    exerciseResult.classList.add("show");
    exerciseStatus.textContent = "운동 계획이 준비되었습니다.";

    exerciseResult.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});
