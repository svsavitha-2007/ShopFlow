/* =========================================================
   SHOPFLOW SERVER
   Express <-> C engine
   Express <-> Gemini AI Assistant
   ========================================================= */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const registerAI = require("./ai");

const PORT = process.env.PORT || 3000;
const TIMEOUT_MS = 5000;

const app = express();

app.use(cors());
app.use(express.json());


/* =========================================================
   FRONTEND
   ========================================================= */

const frontendPath = path.join(__dirname, "..", "frontend");

app.use(express.static(frontendPath));


/* =========================================================
   C ENGINE
   ========================================================= */

// Windows: ecommerce.exe
// macOS/Linux: ecommerce

const exeName =
    process.platform === "win32"
        ? "ecommerce.exe"
        : "ecommerce";

const exePath = path.join(__dirname, exeName);


if (!fs.existsSync(exePath)) {

    console.error(
        `\nC engine not found: ${exePath}`
    );

    console.error(
        "Make sure ecommerce.exe exists inside the backend folder."
    );

    process.exit(1);
}


const engine = spawn(
    exePath,
    ["api"],
    {
        cwd: __dirname
    }
);


let engineAlive = true;
let buffer = "";

const pending = [];


/* =========================================================
   C ENGINE COMMUNICATION
   ========================================================= */

function failAll(message) {

    while (pending.length) {

        const req = pending.shift();

        clearTimeout(req.timer);

        req.reject(
            new Error(message)
        );
    }
}


engine.stdout.on("data", chunk => {

    buffer += chunk.toString();

    const lines = buffer.split("\n");

    buffer = lines.pop();


    for (const raw of lines) {

        const line = raw.trim();

        if (!line) {
            continue;
        }


        try {

            const result =
                JSON.parse(line);

            const req =
                pending.shift();


            if (req) {

                clearTimeout(req.timer);

                req.resolve(result);
            }

        } catch {

            console.log(
                "C INFO:",
                line
            );
        }
    }
});


engine.stderr.on("data", data => {

    console.error(
        "C ERROR:",
        data.toString()
    );
});


engine.on("error", error => {

    engineAlive = false;

    console.error(
        "Failed to start C engine:",
        error.message
    );

    failAll(
        "C engine failed to start"
    );
});


engine.on("close", code => {

    engineAlive = false;

    console.log(
        `C engine exited (${code})`
    );

    failAll(
        "C engine stopped"
    );
});


function sendCommand(command) {

    return new Promise((resolve, reject) => {

        if (!engineAlive) {

            return reject(
                new Error(
                    "C engine is not running"
                )
            );
        }


        const req = {
            resolve,
            reject
        };


        req.timer = setTimeout(() => {

            const index =
                pending.indexOf(req);


            if (index !== -1) {

                pending.splice(
                    index,
                    1
                );
            }


            reject(
                new Error(
                    "C engine did not respond in time"
                )
            );

        }, TIMEOUT_MS);


        pending.push(req);


        try {

            engine.stdin.write(
                command + "\n"
            );

        } catch (error) {

            const index =
                pending.indexOf(req);


            if (index !== -1) {

                pending.splice(
                    index,
                    1
                );
            }


            clearTimeout(
                req.timer
            );


            reject(error);
        }
    });
}


/* =========================================================
   HELPERS
   ========================================================= */

const PRIORITIES = [
    1,
    2,
    3
];


const positiveInt = value =>
    Number.isInteger(
        Number(value)
    ) &&
    Number(value) > 0;


const route = fn => async (req, res) => {

    try {

        const result =
            await fn(req, res);

        res.json(result);

    } catch (error) {

        console.error(
            `${req.method} ${req.originalUrl} failed:`,
            error.message
        );


        res.status(503).json({

            success: false,

            message:
                error.message

        });
    }
};


/* =========================================================
   HEALTH
   ========================================================= */

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            engine:
                engineAlive,

            ai:
                Boolean(
                    process.env.GEMINI_API_KEY
                )

        });

    }
);


/* =========================================================
   AI ASSISTANT
   ========================================================= */

/*
   IMPORTANT:

   The AI code is kept in ai.js.

   server.js only connects ai.js to the C engine
   by giving it the sendCommand function.
*/

registerAI(
    app,
    sendCommand
);


/* =========================================================
   PRODUCTS
   ========================================================= */

app.get(
    "/api/products",
    route(() =>
        sendCommand(
            "VIEW_PRODUCTS"
        )
    )
);


app.get(
    "/api/skiplist",
    route(() =>
        sendCommand(
            "SKIPLIST"
        )
    )
);


app.get(
    "/api/products/:id",
    route(req => {

        if (
            !positiveInt(
                req.params.id
            )
        ) {

            return {

                success: false,

                message:
                    "Invalid product ID"

            };
        }


        return sendCommand(
            `SEARCH|${Number(req.params.id)}`
        );

    })
);


/* =========================================================
   ORDERS
   ========================================================= */

app.post(
    "/api/orders",
    route(req => {

        const {
            productID,
            quantity
        } = req.body || {};


        const priority =
            req.body &&
            req.body.priority !== undefined

                ? req.body.priority

                : 2;


        if (
            !positiveInt(productID) ||
            !positiveInt(quantity)
        ) {

            return {

                success: false,

                message:
                    "productID and quantity must be positive whole numbers"

            };
        }


        if (
            !PRIORITIES.includes(
                Number(priority)
            )
        ) {

            return {

                success: false,

                message:
                    "priority must be 1 (Express), 2 (Standard) or 3 (Economy)"

            };
        }


        return sendCommand(
            `PLACE_ORDER|${Number(productID)}|${Number(quantity)}|${Number(priority)}`
        );

    })
);


app.get(
    "/api/orders",
    route(() =>
        sendCommand(
            "VIEW_QUEUE"
        )
    )
);


app.put(
    "/api/orders/:id/priority",
    route(req => {

        const priority =
            req.body &&
            req.body.priority;


        if (
            !positiveInt(
                req.params.id
            ) ||

            !PRIORITIES.includes(
                Number(priority)
            )
        ) {

            return {

                success: false,

                message:
                    "Order ID and a priority of 1, 2 or 3 are required"

            };
        }


        return sendCommand(
            `SET_PRIORITY|${Number(req.params.id)}|${Number(priority)}`
        );

    })
);


app.post(
    "/api/orders/process",
    route(() =>
        sendCommand(
            "PROCESS_ORDER"
        )
    )
);


app.put(
    "/api/orders/:id",
    route(req => {

        const quantity =
            req.body &&
            req.body.quantity;


        if (
            !positiveInt(
                req.params.id
            ) ||

            !positiveInt(
                quantity
            )
        ) {

            return {

                success: false,

                message:
                    "Order ID and quantity must be positive whole numbers"

            };
        }


        return sendCommand(
            `EDIT_ORDER|${Number(req.params.id)}|${Number(quantity)}`
        );

    })
);


app.delete(
    "/api/orders/:id",
    route(req => {

        if (
            !positiveInt(
                req.params.id
            )
        ) {

            return {

                success: false,

                message:
                    "Invalid order ID"

            };
        }


        return sendCommand(
            `CANCEL_ORDER|${Number(req.params.id)}`
        );

    })
);


/* =========================================================
   UNDO
   ========================================================= */

app.post(
    "/api/undo",
    route(() =>
        sendCommand(
            "UNDO"
        )
    )
);


/* =========================================================
   HISTORY
   ========================================================= */

app.get(
    "/api/history",
    route(() =>
        sendCommand(
            "VIEW_HISTORY"
        )
    )
);


/* =========================================================
   UNKNOWN API ROUTE
   ========================================================= */

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Unknown API route"

        });

    }
);


/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
    PORT,
    () => {

        console.log(
            `ShopFlow running at http://localhost:${PORT}`
        );


        console.log(
            `Frontend folder: ${frontendPath}`
        );


        console.log(
            "AI Assistant routes:"
        );


        console.log(
            "  GET  /api/ai/status"
        );


        console.log(
            "  POST /api/ai/chat"
        );


        console.log(
            "  POST /api/chat"
        );


        console.log(
            `Gemini configured: ${Boolean(
                process.env.GEMINI_API_KEY
            )}`
        );

    }
);


/* =========================================================
   SHUTDOWN
   ========================================================= */

function shutdown() {

    if (engineAlive) {

        try {

            engine.stdin.write(
                "EXIT\n"
            );

        } catch {

            // Ignore shutdown errors.

        }
    }


    setTimeout(
        () => process.exit(0),
        200
    );
}


process.on(
    "SIGINT",
    shutdown
);


process.on(
    "SIGTERM",
    shutdown
);