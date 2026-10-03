#include <stdlib.h>
#include <string.h>

#include "pqueue.h"

static int before(const struct Order *a, const struct Order *b)
{
    if (a->priority != b->priority)
    {
        return a->priority < b->priority;
    }

    return a->sequence < b->sequence;
}

static void swapOrders(struct Order *a, struct Order *b)
{
    struct Order temp = *a;
    *a = *b;
    *b = temp;
}

static void siftUp(struct PriorityQueue *pq, int i)
{
    while (i > 0)
    {
        int parent = (i - 1) / 2;

        if (!before(&pq->items[i], &pq->items[parent]))
        {
            break;
        }

        swapOrders(&pq->items[i], &pq->items[parent]);
        i = parent;
    }
}

static void siftDown(struct PriorityQueue *pq, int i)
{
    for (;;)
    {
        int left = 2 * i + 1;
        int right = left + 1;
        int best = i;

        if (left < pq->size && before(&pq->items[left], &pq->items[best]))
        {
            best = left;
        }

        if (right < pq->size && before(&pq->items[right], &pq->items[best]))
        {
            best = right;
        }

        if (best == i)
        {
            break;
        }

        swapOrders(&pq->items[i], &pq->items[best]);
        i = best;
    }
}

void initPriorityQueue(struct PriorityQueue *pq)
{
    pq->items = NULL;
    pq->size = 0;
    pq->capacity = 0;
    pq->nextSequence = 1;
}

int pqIsEmpty(const struct PriorityQueue *pq)
{
    return pq->size == 0;
}

int pqPush(struct PriorityQueue *pq, struct Order order)
{
    if (pq->size == pq->capacity)
    {
        int capacity = pq->capacity == 0 ? 16 : pq->capacity * 2;
        struct Order *grown =
            (struct Order *)realloc(pq->items, capacity * sizeof(struct Order));

        if (grown == NULL)
        {
            return 0;
        }

        pq->items = grown;
        pq->capacity = capacity;
    }

    if (order.sequence == 0)
    {
        order.sequence = pq->nextSequence++;
    }

    pq->items[pq->size] = order;
    siftUp(pq, pq->size);
    pq->size++;

    return 1;
}

int pqPop(struct PriorityQueue *pq, struct Order *out)
{
    if (pq->size == 0)
    {
        return 0;
    }

    *out = pq->items[0];
    pq->size--;

    if (pq->size > 0)
    {
        pq->items[0] = pq->items[pq->size];
        siftDown(pq, 0);
    }

    return 1;
}

int pqFindIndex(const struct PriorityQueue *pq, int orderID)
{
    int i;

    for (i = 0; i < pq->size; i++)
    {
        if (pq->items[i].orderID == orderID)
        {
            return i;
        }
    }

    return -1;
}

void pqRemoveAt(struct PriorityQueue *pq, int index)
{
    if (index < 0 || index >= pq->size)
    {
        return;
    }

    pq->size--;

    if (index < pq->size)
    {
        pq->items[index] = pq->items[pq->size];
        siftUp(pq, index);
        siftDown(pq, index);
    }
}

void pqChangePriority(struct PriorityQueue *pq, int index, int priority)
{
    if (index < 0 || index >= pq->size)
    {
        return;
    }

    pq->items[index].priority = priority;
    siftUp(pq, index);
    siftDown(pq, index);
}

static int compareOrders(const void *a, const void *b)
{
    const struct Order *x = (const struct Order *)a;
    const struct Order *y = (const struct Order *)b;

    if (before(x, y)) return -1;
    if (before(y, x)) return 1;
    return 0;
}

int pqSortedCopy(const struct PriorityQueue *pq, struct Order *out)
{
    if (pq->size > 0)
    {
        memcpy(out, pq->items, pq->size * sizeof(struct Order));
        qsort(out, pq->size, sizeof(struct Order), compareOrders);
    }

    return pq->size;
}

void freePriorityQueue(struct PriorityQueue *pq)
{
    free(pq->items);
    pq->items = NULL;
    pq->size = 0;
    pq->capacity = 0;
}