# ShopFlow - Order Management System with Advanced DSA & AI

A full-stack e-commerce order management system featuring modern data structures and an AI-powered shopping assistant.

## 📚 Table of Contents

- [Overview](#overview)
- [DSA Architecture](#dsa-architecture)
  - [Skip List for Product Search](#skip-list-for-product-search)
  - [Max-Heap Priority Queue for Orders](#max-heap-priority-queue-for-orders)
- [AI Shopping Assistant](#ai-shopping-assistant)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Installation & Setup](#installation--setup)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [DSA Complexity Table](#dsa-complexity-table)

---

## Overview

ShopFlow is an order management system that demonstrates practical applications of advanced data structures in a real-world application.

### Key Features

- **Product Catalog**: Browse and search products using an optimized Skip List
- **Priority Order Processing**: Express checkout for high-value orders using Max-Heap
- **Standard Order Queue**: FIFO processing for regular orders
- **AI Shopping Assistant**: Natural language product recommendations
- **Undo System**: Revert recent actions using Stack-based history
- **Dark/Light Theme**: Toggle between dark and light UI modes

---

## DSA Architecture

### Skip List for Product Search

**Replaced**: Binary Search Tree (BST)

The Skip List is a probabilistic data structure that provides O(log n) expected time complexity for search, insert, and delete operations. Unlike BSTs, Skip Lists have guaranteed O(log n) performance and avoid the need for rebalancing operations.

#### How It Works

```
Level 4:  -∞ ---------------------------------------> +∞
Level 3:  -∞ -----------------> 105 ---------------> +∞
Level 2:  -∞ ------> 101 -----> 105 -----> 108 ----> +∞
Level 1:  -∞ -> 101 -> 103 -> 105 -> 108 -> 110 ----> +∞
Level 0:  -∞ -> 101 -> 103 -> 105 -> 108 -> 110 ----> +∞
```

**Operations**:
- **Search**: Start from highest level, move forward until next node exceeds target, then drop down level
- **Insert**: Generate random level, insert node, update forward pointers
- **Delete**: Find node, update forward pointers to bypass node

**Why Skip List over BST**:
- O(log n) expected time without complex rebalancing
- Simpler implementation with better cache locality
- Randomization provides consistent performance regardless of input order

**Files**: `backend/skiplist.c`, `backend/skiplist.h`

---

### Max-Heap Priority Queue for Orders

**Enhanced**: Queue (FIFO) with Priority Queue for Express Orders

The system now supports two parallel order queues:
1. **Priority Queue (Max-Heap)**: High-value orders processed first
2. **Standard Queue (FIFO)**: Regular orders processed in arrival order

#### How It Works

```
Max-Heap (by totalAmount):
       130000
      /      \
    30000     4500

Standard FIFO Queue:
[1002 -> 1003 -> ...]
```

**Operations**:
- **Insert**: Add to end, bubble up (`heapifyUp`) to maintain max-heap property
- **Extract Max**: Swap root with last element, remove, `heapifyDown` from root
- **Priority**: Higher `totalAmount` = higher priority

**Why Priority Queue over pure FIFO**:
- High-value orders receive faster fulfillment
- Can optionally maintain FIFO for orders of similar value
- Combines benefits of both approaches

**Files**: `backend/heap.c`, `backend/heap.h`

---

## AI Shopping Assistant

The AI Assistant uses OpenAI's GPT-4o-mini to help users find products and get recommendations.

### How It Works

```
User Request
    ↓
Frontend (/api/ai/chat)
    ↓
Backend (server.js)
    ↓
C Engine (VIEW_PRODUCTS)
    ↓
Product Catalog JSON
    ↓
AI Prompt + User Query
    ↓
OpenAI API (gpt-4o-mini)
    ↓
Recommendation Response
```

### Features

- **Product Recommendations**: Get suggestions based on natural language queries
- **Real Catalog Knowledge**: AI only recommends products from your actual catalog
- **Secure**: API keys never exposed to frontend
- **Context-Aware**: AI knows stock levels and pricing

### Example Queries

```
"I need a budget laptop for programming"
→ Suggests Keyboard (₹1,500) or smartphone alternatives

"Show me the most expensive product"
→ Suggests Laptop (₹65,000)

"I'm looking for headphones under ₹5,000"
→ Suggests Headphones (₹2,500)
```

**Files**: `backend/server.js` (AI endpoint), `frontend/script.js` (chat UI)

---

## Project Structure

```
ShopFlow/
├── frontend/
│   ├── index.html          # Main HTML with AI chat widget
│   ├── script.js           # Frontend logic + AI chat
│   └── style.css           # Styling + AI chat styles
├── backend/
│   ├── server.js           # Express API + AI endpoint
│   ├── package.json        # Node dependencies
│   ├── .env                # Environment variables (API keys)
│   ├── .env.example        # Environment template
│   ├── ecommerce.exe       # Compiled C engine
│   │
│   ├── DSA Implementation Files:
│   │   ├── skiplist.c/h    # Skip List for product search
│   │   ├── heap.c/h        # Max-Heap Priority Queue
│   │   ├── queue.c/h       # Standard FIFO Queue
│   │   ├── stack.c/h       # LIFO Stack for undo
│   │   ├── history.c/h     # Order history tracking
│   │   └── api.c           # C API controller
│   └── main.c              # CLI entry point
└── tests/
    └── (test files)        # DSA and API tests
```

---

## API Documentation

### Product APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | Get all products from Skip List |
| `/api/products/:id` | GET | Search product by ID using Skip List |

### Order APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | POST | Place order (supports `isExpress` flag for Priority Queue) |
| `/api/orders` | GET | View all pending orders (Priority + Standard) |
| `/api/orders/process` | POST | Process next order (Priority first, then FIFO) |
| `/api/orders/:id` | PUT | Edit order quantity |
| `/api/orders/:id` | DELETE | Cancel order |

### AI API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Send message to AI Assistant |

**Request Body**:
```json
{
    "message": "I need a budget laptop"
}
```

**Response**:
```json
{
    "success": true,
    "message": "Based on your needs, I recommend the Keyboard (₹1,500) which is great for programming..."
}
```

### Internal Commands (C Engine)

| Command | Format | Description |
|---------|--------|-------------|
| `VIEW_PRODUCTS` | None | List all products |
| `SEARCH` | `SEARCH|id` | Find product by ID |
| `PLACE_ORDER` | `PLACE_ORDER|id|qty|isExpress` | Create order |
| `VIEW_QUEUE` | None | List pending orders |
| `PROCESS_ORDER` | None | Process next order |
| `EDIT_ORDER` | `EDIT_ORDER|id|qty` | Modify order |
| `CANCEL_ORDER` | `CANCEL_ORDER|id` | Cancel order |
| `UNDO` | None | Undo last action |
| `VIEW_HISTORY` | None | Get order history |

---

## Installation & Setup

### Prerequisites

- **GCC/MinGW** (for compiling C code)
- **Node.js** (v16 or higher)
- **npm** (Node package manager)

### Step 1: Install Node Dependencies

```bash
cd backend
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the `backend` directory:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

The `.env.example` file is provided as a template.

### Step 3: Compile the C Engine

```bash
cd backend
gcc skiplist.c heap.c queue.c stack.c history.c api.c main.c -o ecommerce.exe
```

On Windows, ensure MinGW is installed and in your PATH.

---

## Running the Project

### Option 1: Full Application

```bash
cd backend
node server.js
```

Then open `http://localhost:3000` in your browser.

### Option 2: CLI Mode (Testing DSA)

```bash
cd backend
./ecommerce.exe
```

This launches an interactive command-line interface for testing Skip List and Heap operations.

### Option 3: API Mode (Testing)

```bash
cd backend
./ecommerce.exe api
```

Send commands to stdin and receive JSON responses on stdout.

---

## Testing

### Testing the Skip List

**Compile and test**:
```bash
gcc -o test_skip_list test_skiplist.c skiplist.c
./test_skip_list
```

**Expected outputs**:
- Insert 100 items → Search for all → Delete every other → Verify remaining

### Testing the Max-Heap Priority Queue

```bash
gcc -o test_heap test_heap.c heap.c
./test_heap
```

**Expected outputs**:
- Insert items with different amounts
- Extract max → Verify highest amount extracted first
- Verify heap property maintained

### Testing AI Integration

1. Ensure `.env` has valid `OPENAI_API_KEY`
2. Start the server: `node server.js`
3. Make a request:
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Recommend a laptop"}'
```

### Testing End-to-End

1. Start server: `node server.js`
2. Visit `http://localhost:3000`
3. Add products to cart and checkout with "Express Processing" enabled
4. Check Orders section - Express orders should be marked and processed first
5. Try AI chat: "What's the cheapest product?"

---

## DSA Complexity Table

| Data Structure | Operation | Expected Complexity | Actual Implementation |
|----------------|-----------|---------------------|----------------------|
| **Skip List** | Search | O(log n) | `searchProduct()` |
| | Insert | O(log n) | `insertProduct()` |
| | Delete | O(log n) | `deleteProduct()` |
| | Display | O(n) | `displayProducts()` |
| **Max-Heap** | Insert | O(log n) | `insertHeap()` |
| | Extract Max | O(log n) | `extractMax()` |
| | Heapify | O(log n) | `heapifyUp()`, `heapifyDown()` |
| | Find (for edit) | O(n) | `findOrderInHeap()` |
| **Standard Queue** | Enqueue | O(1) | `enqueue()` |
| | Dequeue | O(1) | `dequeue()` |
| **Stack** | Push | O(1) | `push()` |
| | Pop | O(1) | `pop()` |

### Time Complexity Summary

| Operation | Skip List | Max-Heap | Standard Queue | Stack |
|-----------|-----------|----------|----------------|-------|
| Insert | O(log n) | O(log n) | O(1) | O(1) |
| Search | O(log n) | O(n) | O(n) | O(n) |
| Delete | O(log n) | O(n) | O(1) | O(1) |
| Access Top | O(n) | O(1) | O(1) | O(1) |

---

## Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `backend/bst.c` | Deleted | Old BST implementation |
| `backend/bst.h` | Deleted | Old BST header |
| `backend/skiplist.c` | Created | Skip List implementation |
| `backend/skiplist.h` | Created | Skip List header |
| `backend/heap.c` | Created | Max-Heap Priority Queue |
| `backend/heap.h` | Created | Heap header |
| `backend/api.c` | Modified | Updated for Skip List and Heap |
| `backend/main.c` | Modified | Updated for Skip List |
| `backend/server.js` | Modified | Added AI endpoint |
| `backend/package.json` | Modified | Added openai, dotenv |
| `backend/.env` | Created | API key storage |
| `backend/.env.example` | Created | Environment template |
| `frontend/index.html` | Modified | Added AI chat widget |
| `frontend/script.js` | Modified | Added AI chat logic |
| `frontend/style.css` | Modified | Added AI chat styles |

---

## Security Notes

1. **API Keys**: Never commit `.env` file. Use `.env.example` as template.
2. **AI Endpoint**: All API key handling is server-side only
3. **Input Validation**: All user inputs are validated before processing
4. **SQL Injection**: N/A - using in-memory data structures (no database)

---

## Troubleshooting

### C Compilation Errors

```
gcc: command not found
```
Install MinGW on Windows or GCC on Linux/Mac.

### API Key Errors

```
API key not found
```
Create `.env` file in `backend` directory with `OPENAI_API_KEY`.

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```
Kill existing process: `npx nodemon` or change PORT in `server.js`.

---

## License

This project is for educational purposes as a DSA capstone project.

---

## Author

**Deepsikha K** - DSA Capstone Project

---

*Last updated: 2026-10-02*
