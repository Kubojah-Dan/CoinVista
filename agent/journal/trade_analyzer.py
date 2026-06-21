import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

def analyze_completed_trade(trade_data: dict, groq_api_key: str, model_name: str = None) -> dict:
    if not model_name:
        model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
    llm = ChatGroq(
        model=model_name,
        temperature=0.2,
        groq_api_key=groq_api_key
    )
    
    system_prompt = (
        "You are an expert quantitative trading mentor. Your job is to analyze a completed paper trade and provide a structured review.\n"
        "You must respond with a raw JSON object containing exactly the following keys, and nothing else (no markdown wrappers like ```json, no extra text):\n"
        "{\n"
        '  "strategy": "Classified trading strategy (e.g., Breakout, Mean Reversion, Trend Following, Scalp, News-driven, Unknown)",\n'
        '  "executionScore": Integer score from 0 to 100 evaluating trade discipline, risk management, and execution,\n'
        '  "emotions": ["List of emotions exhibited or detected (e.g., FOMO, fear, patience, greed, disciplined, revenge-trading, overconfidence)"],\n'
        '  "aiReport": "Detailed markdown review outlining what went well, what could be improved, and specific lessons for the future."\n'
        "}\n\n"
        "Evaluation criteria:\n"
        "- Was stop-loss defined? Did they respect it?\n"
        "- Was the risk-to-reward ratio healthy (>= 1.5)?\n"
        "- Did they follow their pre-trade thesis and invalidation level?\n"
        "- Did they close manually early due to fear, or exit at logical targets?"
    )
    
    human_prompt = f"Please analyze this completed trade data:\n{json.dumps(trade_data, indent=2)}"
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        content = response.content.strip()
        
        # Clean potential markdown wrappers
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        analysis = json.loads(content)
        return analysis
    except Exception as e:
        print(f"ERROR: LLM trade analysis failed: {str(e)}")
        return {
            "strategy": trade_data.get("strategy", "Unknown"),
            "executionScore": 70 if trade_data.get("pnl", 0) >= 0 else 50,
            "emotions": ["neutral"],
            "aiReport": f"Failed to generate detailed report due to LLM error: {str(e)}"
        }
