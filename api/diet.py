
import json
import os
from http.server import BaseHTTPRequestHandler

from google import genai


class handler(BaseHTTPRequestHandler):

    def send_json(self, status_code, data):
        response_body = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(status_code)
        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )
        self.send_header("Content-Length", str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def do_POST(self):
        try:
            api_key = os.environ.get("GEMINI_API_KEY")

            if not api_key:
                self.send_json(500, {
                    "success": False,
                    "message": "Gemini API 키가 서버에 설정되지 않았습니다."
                })
                return

            content_length = int(
                self.headers.get("Content-Length", "0")
            )

            if content_length <= 0 or content_length > 10000:
                self.send_json(400, {
                    "success": False,
                    "message": "요청 데이터가 비어 있거나 너무 큽니다."
                })
                return

            data = json.loads(
                self.rfile.read(content_length).decode("utf-8")
            )

            goal = str(data.get("goal", "")).strip()
            food = str(data.get("food", "")).strip()
            dislike = str(data.get("dislike", "")).strip()
            meals = str(data.get("meals", "")).strip()

            if not goal or not food or not meals:
                self.send_json(400, {
                    "success": False,
                    "message": "식단 목표, 좋아하는 음식, 식사 횟수를 입력해 주세요."
                })
                return

            prompt = f"""
당신은 건강한 생활 습관을 돕는 AI 식단 코치입니다.

사용자 정보:
- 식단 목표: {goal}
- 좋아하는 음식: {food}
- 피하고 싶은 음식: {dislike or "특별히 없음"}
- 하루 식사 횟수: {meals}

한국어로 실천하기 쉬운 하루 식단을 추천해 주세요.

다음 내용을 포함하세요.
1. 식단 방향
2. 식사별 추천 메뉴와 대략적인 양
3. 간식 제안
4. 식단 관리 팁

극단적인 절식이나 무리한 감량을 권하지 마세요.
일반적인 건강 정보만 제공하고, 의료 진단이나 치료를 대신하지 마세요.
"""

            client = genai.Client(api_key=api_key)

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            result = response.text

            if not result:
                self.send_json(502, {
                    "success": False,
                    "message": "AI가 추천 결과를 반환하지 않았습니다. 다시 시도해 주세요."
                })
                return

            self.send_json(200, {
                "success": True,
                "message": "AI 식단 추천이 완료되었습니다.",
                "result": result
            })

        except json.JSONDecodeError:
            self.send_json(400, {
                "success": False,
                "message": "요청 데이터 형식이 올바르지 않습니다."
            })

        except Exception:
            self.send_json(500, {
                "success": False,
                "message": "AI 식단 추천 중 오류가 발생했습니다. API 키와 서버 설정을 확인해 주세요."
            })

    def do_GET(self):
        self.send_json(405, {
            "success": False,
            "message": "이 기능은 POST 요청만 지원합니다."
        })
