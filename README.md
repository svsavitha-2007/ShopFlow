# ShopFlow — E-Commerce Order Management System

ShopFlow is a full-stack e-commerce demo that connects a responsive web interface to a Node.js/Express API and a C data-structure engine. It demonstrates product discovery, multi-item checkout, priority-based order processing, undo operations, activity history, and a Gemini-powered AI assistant.

## Features

- **50-product catalog** with product ID, name, price, and stock.
- **Search by product name or product ID.** Numeric ID lookups go through the C Skip List; name searches support case-insensitive partial matches in the loaded catalog.
- **Product-specific local illustrations.** The product art is generated locally from each product name/category, so an item such as Laptop Stand cannot accidentally display a mouse photo, and the catalog remains available offline.
- **Shopping cart and multi-item checkout.** A cart checkout is submitted as one batch with a shared priority.
- **Priority order processing.** Express (1), Standard (2), and Economy (3) are stored in a binary min-heap; lower priority number is processed first, with arrival sequence breaking ties.
- **Batch processing.** When the highest-priority checkout batch reaches the root, all product lines from that same cart are processed together rather than requiring one click per product.
- **Undo Stack** for supported recent edits/cancellations.
- **Order history** for processed product lines.
- **Responsive DSA Engine view** with a full-width Skip List visualization and Priority Queue/Stack panels beneath it.
- **Gemini AI Assistant** via the backend; the API key stays in `backend/.env` and should never be committed or shared.

## Data structures

### Skip List — product lookup

The C Skip List stores products in ascending product-ID order. ID search starts on an upper express lane and moves down levels as needed. Average search time is **O(log n)**; worst-case time is **O(n)**.

Files: `backend/skiplist.c`, `backend/skiplist.h`.

### Priority Queue — binary min-heap

The C min-heap orders pending lines by priority (`1 = Express`, `2 = Standard`, `3 = Economy`). If two orders have equal priority, their arrival sequence preserves FIFO order within that priority.

- Peek at next order: **O(1)**
- Insert: **O(log n)**
- Remove the next order: **O(log n)**

Files: `backend/pqueue.c`, `backend/pqueue.h`.

### Stack — undo

The Stack follows LIFO: the most recently recorded supported action is considered for undo first.

Files: `backend/stack.c`, `backend/stack.h`.

### History list

Processed order lines are appended to the history list and exposed to the History page.

Files: `backend/history.c`, `backend/history.h`.

## Project structure

```text
ShopFlow-main/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── backend/
    ├── server.js       # Express API and frontend hosting
    ├── ai.js           # Gemini assistant integration
    ├── main.c          # C engine entry point
    ├── api.c           # C engine commands and JSON responses
    ├── skiplist.c/.h
    ├── pqueue.c/.h
    ├── stack.c/.h
    ├── history.c/.h
    ├── order.h
    ├── package.json
    └── .env.example
```

## Setup (Windows)

Prerequisites: Node.js/npm and GCC (MSYS2 MinGW-w64 UCRT64 is suitable).

1. Extract the ZIP.
2. Open a terminal in the `backend` directory.
3. Install dependencies and build/start the C engine through the npm scripts:

   ```bash
   npm install
   npm start
   ```

   The `prestart` script compiles the C engine before Express starts.
4. Open `http://localhost:3000`.

### Gemini configuration

Copy `.env.example` to `.env` and add your own Gemini API key to `GEMINI_API_KEY`. Keep `.env` private. The configured default model is `gemini-3.8-flash`.

## Important API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/products` | Return catalog products |
| GET | `/api/products/:id` | Search a product by ID through the Skip List |
| GET | `/api/skiplist` | Return Skip List levels for visualization |
| POST | `/api/orders/batch` | Place all cart lines as one checkout batch |
| POST | `/api/orders` | Place a single product line |
| GET | `/api/orders` | Return pending lines in priority order and raw heap layout |
| POST | `/api/orders/process` | Process every line in the next checkout batch together |
| PUT | `/api/orders/:id` | Edit a pending line's quantity |
| PUT | `/api/orders/:id/priority` | Change a pending line's priority |
| DELETE | `/api/orders/:id` | Cancel a pending line |
| POST | `/api/undo` | Undo the most recent supported action |
| GET | `/api/history` | Return processed lines |
| POST | `/api/ai/chat` | Send a message to the AI assistant |

### Batch checkout request example

```json
{
  "priority": 2,
  "items": [
    { "productID": 116, "quantity": 1 },
    { "productID": 112, "quantity": 2 }
  ]
}
```

The C engine assigns the same `batchID` to both lines. The next processing action removes and records all lines from that batch together, while the heap still orders batches by priority and arrival.

## Demo data

On each fresh C-engine start, ShopFlow loads 50 sample products and seeds five example pending orders so the Skip List and min-heap are visible immediately. This demo state is held in memory and resets when the C engine restarts.

### Product photography
The product catalog uses product-specific photographic images over HTTPS rather than generated cartoon artwork. An internet connection is required for these remote photos. If a photo cannot load, the UI shows a neutral offline fallback rather than substituting a misleading cartoon image.
