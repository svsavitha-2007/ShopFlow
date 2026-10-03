#ifndef PQUEUE_H
#define PQUEUE_H

#include "order.h"

/* Binary min-heap. Lower priority number first, then earlier arrival. */
struct PriorityQueue
{
    struct Order *items;
    int size;
    int capacity;
    unsigned long nextSequence;
};

void initPriorityQueue(struct PriorityQueue *pq);
int  pqIsEmpty(const struct PriorityQueue *pq);

/* Assigns a sequence number when order.sequence == 0. Returns 1 on success. */
int  pqPush(struct PriorityQueue *pq, struct Order order);

/* Removes the most urgent order into *out. Returns 1 on success. */
int  pqPop(struct PriorityQueue *pq, struct Order *out);

int  pqFindIndex(const struct PriorityQueue *pq, int orderID);
void pqRemoveAt(struct PriorityQueue *pq, int index);
void pqChangePriority(struct PriorityQueue *pq, int index, int priority);

/* Copies all orders into out[] in processing order; returns the count. */
int  pqSortedCopy(const struct PriorityQueue *pq, struct Order *out);

void freePriorityQueue(struct PriorityQueue *pq);

#endif