#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "api.h"
#include "skiplist.h"
#include "pqueue.h"
#include "stack.h"
#include "history.h"


/* =========================================================
   SYSTEM STATE
   ========================================================= */

struct EcommerceSystem
{
    struct SkipList products;        /* product catalogue   */
    struct PriorityQueue orders;     /* pending orders      */
    struct Stack undoStack;          /* undo history        */
    struct OrderHistory history;     /* processed orders    */
    int nextOrderID;
};


/* =========================================================
   JSON HELPERS  (API mode must print JSON lines only)
   ========================================================= */

static void fail(const char *message)
{
    printf("{\"success\":false,\"message\":\"%s\"}\n", message);
    fflush(stdout);
}

static const char *priorityLabel(int priority)
{
    if (priority == PRIORITY_EXPRESS) return "Express";
    if (priority == PRIORITY_ECONOMY) return "Economy";
    return "Standard";
}

static void printOrder(const struct Order *o)
{
    printf("{\"id\":%d,\"productID\":%d,\"quantity\":%d,\"amount\":%.2f,"
           "\"priority\":%d,\"priorityLabel\":\"%s\",\"status\":\"%s\"}",
           o->orderID, o->productID, o->quantity, o->totalAmount,
           o->priority, priorityLabel(o->priority), o->status);
}

static void printProduct(const struct Product *p)
{
    printf("{\"id\":%d,\"name\":\"%s\",\"price\":%.2f,\"stock\":%d,\"level\":%d}",
           p->productID, p->name, p->price, p->stock, p->level);
}

/* Strict integer parse: the whole string must be a number */
static int parseInt(const char *text, int *out)
{
    char *end;
    long value;

    if (text == NULL || *text == '\0')
    {
        return 0;
    }

    value = strtol(text, &end, 10);

    if (*end != '\0')
    {
        return 0;
    }

    *out = (int)value;
    return 1;
}

static int validPriority(int priority)
{
    return priority >= PRIORITY_EXPRESS && priority <= PRIORITY_ECONOMY;
}


/* =========================================================
   INITIALISE
   ========================================================= */

static void initializeSystem(struct EcommerceSystem *system)
{
    initSkipList(&system->products);
    initPriorityQueue(&system->orders);
    initializeStack(&system->undoStack);
    initializeHistory(&system->history);

    /* A varied starter catalogue keeps the Skip List useful on first launch. */
    system->nextOrderID = 1001;

    skipInsert(&system->products, 101, "Smartphone",       30000, 15);
    skipInsert(&system->products, 103, "Keyboard",          1500, 20);
    skipInsert(&system->products, 105, "Laptop",            65000, 10);
    skipInsert(&system->products, 108, "Smartwatch",         5000, 12);
    skipInsert(&system->products, 110, "Headphones",         2500, 25);
    skipInsert(&system->products, 112, "Wireless Mouse",      899, 35);
    skipInsert(&system->products, 113, "USB-C Hub",          1799, 22);
    skipInsert(&system->products, 114, "Bluetooth Speaker",  2499, 18);
    skipInsert(&system->products, 115, "Android Tablet",    22999, 14);
    skipInsert(&system->products, 116, "Laptop Stand",       1299, 30);
    skipInsert(&system->products, 117, "Webcam HD",          3499, 16);
    skipInsert(&system->products, 118, "Mechanical Keyboard",4599, 12);
    skipInsert(&system->products, 119, "Power Bank",         1499, 28);
    skipInsert(&system->products, 120, "Wireless Earbuds",   2999, 24);
    skipInsert(&system->products, 121, "Gaming Mouse",       2199, 20);
    skipInsert(&system->products, 122, "Gaming Headset",     3999, 15);
    skipInsert(&system->products, 123, "Portable SSD 1TB",  7499, 11);
    skipInsert(&system->products, 124, "External HDD 2TB",  5999, 13);
    skipInsert(&system->products, 125, "Wi-Fi Router",      2899, 17);
    skipInsert(&system->products, 126, "Smart Bulb Set",    1199, 32);
    skipInsert(&system->products, 127, "Security Camera",   4299, 10);
    skipInsert(&system->products, 128, "Fitness Band",      1999, 26);
    skipInsert(&system->products, 129, "DSLR Camera",      48999, 6);
    skipInsert(&system->products, 130, "Camera Tripod",     1799, 19);
    skipInsert(&system->products, 131, "Ring Light",         999, 27);
    skipInsert(&system->products, 132, "Laser Printer",    12999, 8);
    skipInsert(&system->products, 133, "Ink Cartridge",     1599, 21);
    skipInsert(&system->products, 134, "Office Chair",      8999, 9);
    skipInsert(&system->products, 135, "Desk Lamp",          799, 31);
    skipInsert(&system->products, 136, "Air Purifier",      9999, 7);
    skipInsert(&system->products, 137, "Electric Kettle",   1499, 23);
    skipInsert(&system->products, 138, "Coffee Maker",      4999, 12);
    skipInsert(&system->products, 139, "Air Fryer",         6999, 10);
    skipInsert(&system->products, 140, "Mixer Grinder",     3499, 14);
    skipInsert(&system->products, 141, "Induction Cooktop", 2799, 18);
    skipInsert(&system->products, 142, "Vacuum Cleaner",    8499, 8);
    skipInsert(&system->products, 143, "Travel Backpack",   1899, 25);
    skipInsert(&system->products, 144, "Carry-on Suitcase", 5499, 11);
    skipInsert(&system->products, 145, "Water Bottle",       599, 40);
    skipInsert(&system->products, 146, "Desk Organizer",     699, 33);
    skipInsert(&system->products, 147, "4K Smart TV",       32999, 7);
    skipInsert(&system->products, 148, "27-inch Monitor",  15999, 9);
    skipInsert(&system->products, 149, "Monitor Arm",       2499, 13);
    skipInsert(&system->products, 150, "HDMI Cable",         399, 45);
    skipInsert(&system->products, 151, "USB Flash Drive",    599, 38);
    skipInsert(&system->products, 152, "Surge Protector",    899, 24);
    skipInsert(&system->products, 153, "Phone Case",         499, 42);
    skipInsert(&system->products, 154, "Screen Protector",   299, 50);
    skipInsert(&system->products, 155, "Fast Charger",       999, 29);
    skipInsert(&system->products, 156, "Bluetooth Tracker", 1799, 16);

    /* Seed a small, realistic queue so the heap is visible before checkout. */
    {
        const int demoProductIDs[] = {105, 115, 101, 121, 110};
        const int demoQuantities[] = {1, 1, 1, 2, 2};
        const int demoPriorities[] = {PRIORITY_EXPRESS, PRIORITY_EXPRESS,
                                      PRIORITY_STANDARD, PRIORITY_STANDARD,
                                      PRIORITY_ECONOMY};
        int i;

        for (i = 0; i < 5; i++)
        {
            struct Product *product = skipSearch(&system->products, demoProductIDs[i], NULL);
            struct Order order;

            if (product == NULL || product->stock < demoQuantities[i]) continue;

            memset(&order, 0, sizeof(order));
            order.orderID = system->nextOrderID++;
            order.productID = demoProductIDs[i];
            order.quantity = demoQuantities[i];
            order.totalAmount = product->price * demoQuantities[i];
            order.priority = demoPriorities[i];
            strcpy(order.status, "Pending");

            if (pqPush(&system->orders, order))
                product->stock -= demoQuantities[i];
        }
    }
}


/* =========================================================
   PRODUCTS
   ========================================================= */

static void apiSearchProduct(struct EcommerceSystem *system, int productID)
{
    int steps = 0;
    struct Product *product = skipSearch(&system->products, productID, &steps);

    if (product == NULL)
    {
        printf("{\"success\":false,\"message\":\"Product not found\",\"steps\":%d}\n", steps);
        fflush(stdout);
        return;
    }

    printf("{\"success\":true,\"steps\":%d,\"product\":", steps);
    printProduct(product);
    printf("}\n");
    fflush(stdout);
}

static void apiViewProducts(struct EcommerceSystem *system)
{
    struct Product *current = system->products.header->forward[0];
    int first = 1;

    printf("{\"success\":true,\"products\":[");

    /* Level 0 of a skip list is a sorted linked list of every product */
    while (current != NULL)
    {
        if (!first) printf(",");
        printProduct(current);
        first = 0;
        current = current->forward[0];
    }

    printf("]}\n");
    fflush(stdout);
}

/* Every lane of the skip list, for the DSA visualisation */
static void apiViewSkipList(struct EcommerceSystem *system)
{
    int level;

    printf("{\"success\":true,\"size\":%d,\"levels\":[", system->products.size);

    for (level = 0; level <= system->products.level; level++)
    {
        struct Product *current = system->products.header->forward[level];
        int first = 1;

        if (level > 0) printf(",");
        printf("[");

        while (current != NULL)
        {
            if (!first) printf(",");
            printf("%d", current->productID);
            first = 0;
            current = current->forward[level];
        }

        printf("]");
    }

    printf("]}\n");
    fflush(stdout);
}


/* =========================================================
   ORDERS
   ========================================================= */

static void apiPlaceOrder(struct EcommerceSystem *system,
                          int productID, int quantity, int priority)
{
    struct Product *product = skipSearch(&system->products, productID, NULL);
    struct Order order;

    if (product == NULL)             { fail("Product not found"); return; }
    if (quantity <= 0)               { fail("Invalid quantity"); return; }
    if (!validPriority(priority))    { fail("Invalid priority"); return; }
    if (quantity > product->stock)   { fail("Insufficient stock"); return; }

    memset(&order, 0, sizeof(order));
    order.orderID = system->nextOrderID++;
    order.productID = productID;
    order.quantity = quantity;
    order.totalAmount = product->price * quantity;
    order.priority = priority;
    strcpy(order.status, "Pending");

    if (!pqPush(&system->orders, order))
    {
        fail("Out of memory");
        return;
    }

    product->stock -= quantity;

    printf("{\"success\":true,\"message\":\"Order placed successfully\",\"order\":");
    printOrder(&order);
    printf("}\n");
    fflush(stdout);
}

static void apiViewQueue(struct EcommerceSystem *system)
{
    struct Order *sorted = NULL;
    int count = system->orders.size;
    int i;

    if (count > 0)
    {
        sorted = (struct Order *)malloc(count * sizeof(struct Order));

        if (sorted == NULL)
        {
            fail("Out of memory");
            return;
        }

        pqSortedCopy(&system->orders, sorted);
    }

    /* "orders" is in processing order; "heap" is the raw heap array */
    printf("{\"success\":true,\"orders\":[");

    for (i = 0; i < count; i++)
    {
        if (i > 0) printf(",");
        printOrder(&sorted[i]);
    }

    printf("],\"heap\":[");

    for (i = 0; i < count; i++)
    {
        if (i > 0) printf(",");
        printf("{\"id\":%d,\"priority\":%d}",
               system->orders.items[i].orderID,
               system->orders.items[i].priority);
    }

    printf("]}\n");
    fflush(stdout);

    free(sorted);
}

static void apiProcessOrder(struct EcommerceSystem *system)
{
    struct Order order;

    if (!pqPop(&system->orders, &order))
    {
        fail("No pending orders");
        return;
    }

    strcpy(order.status, "Processed");
    addToHistory(&system->history, order);

    printf("{\"success\":true,\"message\":\"Order processed successfully\",\"order\":");
    printOrder(&order);
    printf("}\n");
    fflush(stdout);
}

static void apiEditOrder(struct EcommerceSystem *system, int orderID, int newQuantity)
{
    int index = pqFindIndex(&system->orders, orderID);
    struct Order *order;
    struct Product *product;
    struct OrderAction action;
    int difference;

    if (index < 0)         { fail("Pending order not found"); return; }
    if (newQuantity <= 0)  { fail("Invalid quantity"); return; }

    order = &system->orders.items[index];
    product = skipSearch(&system->products, order->productID, NULL);

    if (product == NULL)   { fail("Product not found"); return; }

    difference = newQuantity - order->quantity;

    if (difference > product->stock)
    {
        fail("Insufficient stock for quantity increase");
        return;
    }

    memset(&action, 0, sizeof(action));
    action.orderID = orderID;
    strcpy(action.actionType, "Quantity Changed");
    action.productID = order->productID;
    action.oldQuantity = order->quantity;
    action.newQuantity = newQuantity;
    action.oldAmount = order->totalAmount;
    action.newAmount = product->price * newQuantity;
    push(&system->undoStack, action);

    product->stock -= difference;
    order->quantity = newQuantity;
    order->totalAmount = action.newAmount;

    printf("{\"success\":true,\"message\":\"Order updated successfully\",\"order\":");
    printOrder(order);
    printf("}\n");
    fflush(stdout);
}

static void apiSetPriority(struct EcommerceSystem *system, int orderID, int priority)
{
    int index = pqFindIndex(&system->orders, orderID);
    struct OrderAction action;

    if (index < 0)                { fail("Pending order not found"); return; }
    if (!validPriority(priority)) { fail("Invalid priority"); return; }

    if (system->orders.items[index].priority == priority)
    {
        fail("Order already has this priority");
        return;
    }

    memset(&action, 0, sizeof(action));
    action.orderID = orderID;
    strcpy(action.actionType, "Priority Changed");
    action.productID = system->orders.items[index].productID;
    action.oldPriority = system->orders.items[index].priority;
    action.newPriority = priority;
    push(&system->undoStack, action);

    pqChangePriority(&system->orders, index, priority);

    printf("{\"success\":true,\"message\":\"Priority changed to %s\",\"orderID\":%d}\n",
           priorityLabel(priority), orderID);
    fflush(stdout);
}

static void apiCancelOrder(struct EcommerceSystem *system, int orderID)
{
    int index = pqFindIndex(&system->orders, orderID);
    struct Order order;
    struct Product *product;
    struct OrderAction action;

    if (index < 0) { fail("Pending order not found"); return; }

    order = system->orders.items[index];
    product = skipSearch(&system->products, order.productID, NULL);

    if (product == NULL) { fail("Product not found"); return; }

    memset(&action, 0, sizeof(action));
    action.orderID = orderID;
    strcpy(action.actionType, "Order Cancelled");
    action.productID = order.productID;
    action.oldQuantity = order.quantity;
    action.oldAmount = order.totalAmount;
    action.oldPriority = order.priority;
    action.sequence = order.sequence;
    push(&system->undoStack, action);

    product->stock += order.quantity;
    pqRemoveAt(&system->orders, index);

    printf("{\"success\":true,\"message\":\"Order cancelled successfully\",\"orderID\":%d}\n", orderID);
    fflush(stdout);
}


/* =========================================================
   UNDO  (stack, last in first out)
   ========================================================= */

static void apiUndo(struct EcommerceSystem *system)
{
    struct OrderAction action;
    struct Product *product;
    int index;

    if (isStackEmpty(&system->undoStack))
    {
        fail("Nothing to undo");
        return;
    }

    action = system->undoStack.top->action;
    pop(&system->undoStack);

    product = skipSearch(&system->products, action.productID, NULL);
    index = pqFindIndex(&system->orders, action.orderID);

    if (strcmp(action.actionType, "Order Cancelled") == 0)
    {
        struct Order order;

        if (product == NULL || product->stock < action.oldQuantity)
        {
            fail("Not enough stock to restore the cancelled order");
            return;
        }

        memset(&order, 0, sizeof(order));
        order.orderID = action.orderID;
        order.productID = action.productID;
        order.quantity = action.oldQuantity;
        order.totalAmount = action.oldAmount;
        order.priority = action.oldPriority;
        order.sequence = action.sequence;      /* same place in line as before */
        strcpy(order.status, "Pending");

        product->stock -= action.oldQuantity;
        pqPush(&system->orders, order);
    }
    else if (index < 0 || product == NULL)
    {
        fail("That order was already processed, nothing to undo");
        return;
    }
    else if (strcmp(action.actionType, "Quantity Changed") == 0)
    {
        int difference = action.newQuantity - action.oldQuantity;

        if (product->stock + difference < 0)
        {
            fail("Not enough stock to restore the old quantity");
            return;
        }

        system->orders.items[index].quantity = action.oldQuantity;
        system->orders.items[index].totalAmount = action.oldAmount;
        product->stock += difference;           /* adjust by the difference only */
    }
    else if (strcmp(action.actionType, "Priority Changed") == 0)
    {
        pqChangePriority(&system->orders, index, action.oldPriority);
    }

    printf("{\"success\":true,\"message\":\"Undid: %s\",\"action\":\"%s\",\"orderID\":%d}\n",
           action.actionType, action.actionType, action.orderID);
    fflush(stdout);
}


/* =========================================================
   HISTORY
   ========================================================= */

static void apiViewHistory(struct EcommerceSystem *system)
{
    struct HistoryNode *current = system->history.head;
    int first = 1;

    printf("{\"success\":true,\"orders\":[");

    while (current != NULL)
    {
        if (!first) printf(",");
        printOrder(&current->order);
        first = 0;
        current = current->next;
    }

    printf("]}\n");
    fflush(stdout);
}


/* =========================================================
   COMMAND PROCESSOR
   Format: COMMAND|arg1|arg2|arg3
   ========================================================= */

static void processCommand(struct EcommerceSystem *system, char *line)
{
    char *args[4] = { NULL, NULL, NULL, NULL };
    char *token = strtok(line, "|");
    int count = 0;
    int a = 0, b = 0, c = 0;

    while (token != NULL && count < 4)
    {
        args[count++] = token;
        token = strtok(NULL, "|");
    }

    if (count == 0)
    {
        fail("Invalid command");
        return;
    }

    if (strcmp(args[0], "VIEW_PRODUCTS") == 0) { apiViewProducts(system); return; }
    if (strcmp(args[0], "SKIPLIST") == 0)      { apiViewSkipList(system); return; }
    if (strcmp(args[0], "VIEW_QUEUE") == 0)    { apiViewQueue(system);    return; }
    if (strcmp(args[0], "PROCESS_ORDER") == 0) { apiProcessOrder(system); return; }
    if (strcmp(args[0], "UNDO") == 0)          { apiUndo(system);         return; }
    if (strcmp(args[0], "VIEW_HISTORY") == 0)  { apiViewHistory(system);  return; }

    if (strcmp(args[0], "EXIT") == 0)
    {
        printf("{\"success\":true,\"message\":\"C API shutting down\"}\n");
        fflush(stdout);
        return;
    }

    if (strcmp(args[0], "SEARCH") == 0)
    {
        if (!parseInt(args[1], &a)) { fail("Product ID required"); return; }
        apiSearchProduct(system, a);
        return;
    }

    if (strcmp(args[0], "PLACE_ORDER") == 0)
    {
        c = PRIORITY_STANDARD;      /* priority is optional */

        if (!parseInt(args[1], &a) || !parseInt(args[2], &b) ||
            (args[3] != NULL && !parseInt(args[3], &c)))
        {
            fail("Product ID and quantity required");
            return;
        }

        apiPlaceOrder(system, a, b, c);
        return;
    }

    if (strcmp(args[0], "EDIT_ORDER") == 0)
    {
        if (!parseInt(args[1], &a) || !parseInt(args[2], &b))
        {
            fail("Order ID and quantity required");
            return;
        }

        apiEditOrder(system, a, b);
        return;
    }

    if (strcmp(args[0], "SET_PRIORITY") == 0)
    {
        if (!parseInt(args[1], &a) || !parseInt(args[2], &b))
        {
            fail("Order ID and priority required");
            return;
        }

        apiSetPriority(system, a, b);
        return;
    }

    if (strcmp(args[0], "CANCEL_ORDER") == 0)
    {
        if (!parseInt(args[1], &a)) { fail("Order ID required"); return; }
        apiCancelOrder(system, a);
        return;
    }

    fail("Unknown command");
}


/* =========================================================
   API MODE
   ========================================================= */

void runApiMode(void)
{
    struct EcommerceSystem system;
    char line[500];

    initializeSystem(&system);

    while (fgets(line, sizeof(line), stdin) != NULL)
    {
        line[strcspn(line, "\r\n")] = '\0';

        if (strcmp(line, "EXIT") == 0)
        {
            processCommand(&system, line);
            break;
        }

        processCommand(&system, line);
    }

    freeSkipList(&system.products);
    freePriorityQueue(&system.orders);
    freeStack(&system.undoStack);
    freeHistory(&system.history);
}