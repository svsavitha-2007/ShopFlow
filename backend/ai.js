require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_INSTRUCTION = `
You are ShopFlow AI Assistant.

ShopFlow is an e-commerce order management system.

Your job is to help users understand:
- products
- product stock
- orders
- order priorities
- order processing
- order history
- ShopFlow's DSA features

ShopFlow uses data structures including:
- Queue for FIFO order processing
- Priority Queue for priority-based orders
- Stack for undo/history operations
- Skip List for fast product searching

IMPORTANT RULES:
1. Answer using the ShopFlow data provided to you.
2. Never invent products, orders, stock values, prices, or statuses.
3. If the required information is not available, clearly say that you do not have that information.
4. Do not claim that an order was created, deleted, processed, or modified unless the backend confirms it.
5. Keep answers clear and beginner-friendly.
6. You may explain how ShopFlow's data structures work.
7. You are currently a READ-ONLY assistant.
8. Do not ask the user for API keys, passwords, or private credentials.
`;

const requestTimes = [];
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function allowedRequest() {
    const now = Date.now();

    while (
        requestTimes.length > 0 &&
        now - requestTimes[0] > RATE_WINDOW_MS
    ) {
        requestTimes.shift();
    }

    if (requestTimes.length >= RATE_LIMIT) {
        return false;
    }

    requestTimes.push(now);
    return true;
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .slice(-10)
        .map(message => {
            if (!message || typeof message !== "object") {
                return null;
            }

            const role =
                message.role === "assistant"
                    ? "model"
                    : "user";

            const content =
                typeof message.content === "string"
                    ? message.content.slice(0, 4000)
                    : "";

            if (!content.trim()) {
                return null;
            }

            return {
                role,
                parts: [
                    {
                        text: content
                    }
                ]
            };
        })
        .filter(Boolean);
}

async function getShopFlowContext(sendCommand) {
    let products = [];
    let queue = [];
    let history = [];

    try {
        const productResult = await sendCommand("VIEW_PRODUCTS");

        if (productResult && productResult.success !== false) {
            products = Array.isArray(productResult.products)
                ? productResult.products
                : Array.isArray(productResult.data)
                    ? productResult.data
                    : Array.isArray(productResult)
                        ? productResult
                        : [];
        }
    } catch (error) {
        console.error(
            "Could not read products:",
            error.message
        );
    }

    try {
        const queueResult = await sendCommand("VIEW_QUEUE");

        if (queueResult && queueResult.success !== false) {
            queue = Array.isArray(queueResult.orders)
                ? queueResult.orders
                : Array.isArray(queueResult.queue)
                    ? queueResult.queue
                    : Array.isArray(queueResult)
                        ? queueResult
                        : [];
        }
    } catch (error) {
        console.error(
            "Could not read queue:",
            error.message
        );
    }

    try {
        const historyResult = await sendCommand("VIEW_HISTORY");

        if (historyResult && historyResult.success !== false) {
            history = Array.isArray(historyResult.orders)
                ? historyResult.orders
                : Array.isArray(historyResult.history)
                    ? historyResult.history
                    : Array.isArray(historyResult)
                        ? historyResult
                        : [];
        }
    } catch (error) {
        console.error(
            "Could not read history:",
            error.message
        );
    }

    return {
        products,
        queue,
        history
    };
}

function buildContext(data) {
    return `
CURRENT SHOPFLOW DATA

PRODUCTS:
${JSON.stringify(data.products, null, 2)}

ORDER QUEUE:
${JSON.stringify(data.queue, null, 2)}

ORDER HISTORY:
${JSON.stringify(data.history, null, 2)}
`;
}

async function askGemini(
    userMessage,
    history,
    shopFlowData
) {
    if (!GEMINI_API_KEY) {
        throw new Error(
            "Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env."
        );
    }

    const context = buildContext(shopFlowData);
    const previousMessages = sanitizeHistory(history);

    // The Interactions API accepts a text input. Include a compact transcript
    // so the assistant can use recent turns without relying on client state IDs.
    const transcript = previousMessages
        .map(message => {
            const speaker = message.role === "model" ? "Assistant" : "User";
            const text = message.parts
                .map(part => part.text || "")
                .join(" ")
                .trim();
            return text ? `${speaker}: ${text}` : "";
        })
        .filter(Boolean)
        .join("\n");

    const input = `${SYSTEM_INSTRUCTION}

${context}

RECENT CONVERSATION:
${transcript || "No previous messages."}

USER QUESTION:
${userMessage}

Answer the user's question directly. For product, stock, pending-order, and history questions, use only the CURRENT SHOPFLOW DATA above. If the needed data is missing or empty, say so instead of guessing.`;

    const url = "https://generativelanguage.googleapis.com/v1beta/interactions";
    let response;

    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
                model: GEMINI_MODEL,
                input,
                store: false
            })
        });
    } catch (error) {
        console.error("Gemini connection error:", error.message);
        throw new Error(
            "Could not connect to Gemini. Check your internet connection and try again."
        );
    }

    const responseText = await response.text();
    let data;

    try {
        data = JSON.parse(responseText);
    } catch {
        console.error("Gemini returned invalid JSON:", responseText);
        throw new Error("Gemini returned an invalid response.");
    }

    if (!response.ok) {
        console.error(`Gemini returned HTTP ${response.status}:`, data);
        const apiMessage = data?.error?.message || "";

        if (response.status === 400) {
            throw new Error(
                apiMessage || "Gemini rejected the request. Check the model name and API request format."
            );
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error(
                "Gemini API key is invalid or does not have permission to use this API. Check the key in backend/.env."
            );
        }
        if (response.status === 429) {
            throw new Error(
                "Gemini rate or quota limit has been reached. Wait a moment and try again."
            );
        }
        throw new Error(apiMessage || `Gemini API error (HTTP ${response.status}).`);
    }

    // Interactions API returns output_text for standard text responses.
    // Keep a steps fallback for SDK/API response variations.
    const stepText = Array.isArray(data?.steps)
        ? data.steps
            .filter(step => step?.type === "text" || step?.content)
            .map(step => {
                if (typeof step.text === "string") return step.text;
                if (typeof step.content === "string") return step.content;
                if (Array.isArray(step.content)) {
                    return step.content
                        .map(item => item?.text || "")
                        .join(" ");
                }
                return "";
            })
            .filter(Boolean)
            .join("\n")
        : "";

    const answer = (
        typeof data?.output_text === "string"
            ? data.output_text
            : stepText
    ).trim();

    if (!answer) {
        console.error("Gemini returned no text:", JSON.stringify(data, null, 2));
        throw new Error("Gemini returned an empty response. Please try again.");
    }

    return answer;
}

function registerAI(app, sendCommand) {

    app.get("/api/ai/status", (req, res) => {
        res.json({
            success: true,
            configured: Boolean(GEMINI_API_KEY),
            provider: "Google Gemini",
            model: GEMINI_MODEL,
            message: GEMINI_API_KEY
                ? "AI Assistant is configured."
                : "Add GEMINI_API_KEY to backend/.env and restart the server."
        });
    });

    async function handleChat(req, res) {

        try {

            if (!allowedRequest()) {
                return res.status(429).json({
                    success: false,
                    error:
                        "Too many requests. Please wait a moment and try again."
                });
            }

            const message =
                typeof req.body?.message === "string"
                    ? req.body.message.trim()
                    : "";

            const history =
                Array.isArray(req.body?.history)
                    ? req.body.history
                    : [];

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: "Please enter a message."
                });
            }

            if (message.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: "Message is too long."
                });
            }

            if (!GEMINI_API_KEY) {
                return res.status(503).json({
                    success: false,
                    error:
                        "Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env and restart the server."
                });
            }

            console.log(
                "AI question:",
                message
            );

            const shopFlowData =
                await getShopFlowContext(
                    sendCommand
                );

            const answer =
                await askGemini(
                    message,
                    history,
                    shopFlowData
                );

            return res.json({
                success: true,
                reply: answer
            });

        } catch (error) {

            console.error(
                "AI Assistant error:",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error.message ||
                    "AI Assistant encountered an error."
            });
        }
    }

    app.post(
        "/api/chat",
        handleChat
    );

    app.post(
        "/api/ai/chat",
        handleChat
    );

    console.log(
        "Gemini AI Assistant registered."
    );
}

module.exports = registerAI;