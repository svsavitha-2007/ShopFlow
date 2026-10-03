#ifndef HEAP_H
#define HEAP_H

#include "queue.h"

/* Max-Heap for Priority Orders based on totalAmount */
struct Heap
{
    struct Order *array;
    int capacity;
    int size;
};

/* Heap Functions */
void initializeHeap(struct Heap *heap);
void insertHeap(struct Heap *heap, struct Order order);
int extractMax(struct Heap *heap, struct Order *outOrder);
void heapifyUp(struct Heap *heap, int index);
void heapifyDown(struct Heap *heap, int index);
void displayHeap(struct Heap *heap);

/* We may also need searching in heap for Edit/Cancel actions */
int findOrderInHeap(struct Heap *heap, int orderID);
void removeOrderFromHeap(struct Heap *heap, int index);
void freeHeap(struct Heap *heap);

#endif