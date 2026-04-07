import { GoogleGenAI, Type } from "@google/genai";

export interface AnalysisResult {
  score: number;
  title: string;
  description: string;
  warning: string;
  type: 'scholar' | 'corrupt' | 'neutral';
}

export async function analyzeFaceIntegrity(base64Image: string): Promise<AnalysisResult> {
  // API 키 확인
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  // 데이터 URL에서 마임타입과 순수 데이터 추출
  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
  const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, "");

  const prompt = `
    당신은 관상 전문가이자 유머러스한 AI 분석가입니다. 
    사용자가 제공한 사진의 관상을 분석하여 '청렴도 점수'를 매겨주세요.
    
    분석 결과는 다음 항목을 포함해야 합니다:
    1. score: 0~100점 사이의 청렴도 점수.
    2. title: 이 사람의 관상을 한마디로 정의하는 재미있는 칭호 (예: '황금 보기를 돌같이 하는 선비', '법인카드로 소고기 사먹을 관상' 등).
    3. description: 관상 특징을 기반으로 한 유머러스하고 약간 과장된 설명. (예: "눈매가 날카로운 것이 예산안의 빈틈을 기가 막히게 찾아낼 상이로군요.")
    4. warning: 장난스럽고 과장된 경고 메시지. (예: "비타500 박스를 조심하십시오. 그 안에 든 것이 음료가 아닐 수도 있습니다.")
    5. type: 'scholar' (청렴), 'corrupt' (부패/횡령 가능성), 'neutral' (보통) 중 하나.

    반드시 한국어로 답변하고, JSON 형식으로 출력하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            warning: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['scholar', 'corrupt', 'neutral'] }
          },
          required: ['score', 'title', 'description', 'warning', 'type']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI가 응답을 생성하지 못했습니다.");
    
    return JSON.parse(text) as AnalysisResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API key not valid")) {
      throw new Error("유효하지 않은 API 키입니다.");
    }
    throw new Error(error.message || "분석 중 알 수 없는 오류가 발생했습니다.");
  }
}
