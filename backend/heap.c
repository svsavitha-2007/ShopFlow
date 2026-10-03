#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "heap.h"

#define INITIAL_CAPACITY 100

void initializeHeap(struct Heap *heap)
{
    heap->capacity = INITIAL_CAPACITY;
    heap->size = 0;
    heap->array = (struct Order*)malloc(heap->capacity * sizeof(struct Order));
}

void swapOrders(struct Order *a, struct Order *b)
{
    struct Order temp = *a;
    *a = *b;
    *b = temp;
}

void heapifyUp(struct Heap *heap, int index)
{
    if (index && heap->array[(index - 1) / 2].totalAmount < heap->array[index].totalAmount)
    {
        swapOrders(&heap->array[(index - 1) / 2], &heap->array[index]);
        heapifyUp(heap, (index - 1) / 2);
    }
}

void insertHeap(struct Heap *heap, struct Order order)
{
    if (heap->size == heap->capacity)
    {
        heap->capacity *= 2;
        heap->array = (struct Order*)realloc(heap->array, heap->capacity * sizeof(struct Order));
    }

    // Express priority orders are marked via status initially, allowing heap priority
    strcpy(order.status, "Priority Pending");

    heap->array[heap->size] = order;
    heap->size++;
    heapifyUp(heap, heap->size - 1);
}

void heapifyDown(struct Heap *heap, int index)
{
    int largest = index;
    int left = 2 * index + 1;
    int right = 2 * index + 2;

    if (left < heap->size && heap->array[left].totalAmount > heap->array[largest].totalAmount)
        largest = left;

    if (right < heap->size && heap->array[right].totalAmount > heap->array[largest].totalAmount)
        largest = right;

    if (largest != index)
    {
        swapOrders(&heap->array[index], &heap->array[largest]);
        heapifyDown(heap, largest);
    }
}

int extractMax(struct Heap *heap, struct Order *outOrder)
{
    if (heap->size <= 0) return 0; // Empty

    if (heap->size == 1)
    {
        heap->size--;
        *outOrder = heap->array[0];
        return 1;
    }

    *outOrder = heap->array[0];
    heap->array[0] = heap->array[heap->size - 1];
    heap->size--;
    heapifyDown(heap, 0);

    return 1;
}

int findOrderInHeap(struct Heap *heap, int orderID)
{
    for (int i = 0; i < heap->size; i++)
    {
        if (heap->array[i].orderID == orderID) return i;
    }
    return -1;
}

void removeOrderFromHeap(struct Heap *heap, int index)
{
    if (index < 0 || index >= heap->size) return;

    heap->array[index] = heap->array[heap->size - 1];
    heap->size--;

    // Either bubble up or down depending on the new value at index
    int parent = (index - 1) / 2;
    if (index > 0 && heap->array[index].totalAmount > heap->array[parent].totalAmount)
    {
        heapifyUp(heap, index);
    }
    else
    {
        heapifyDown(heap, index);
    }
}

void displayHeap(struct Heap *heap)
{
    for (int i = 0; i < heap->size; i++)
    {
        printf(
            "Priority Order %d | Product %d | Quantity %d | Amount %.2f | Status: %s\n",
            heap->array[i].orderID,
            heap->array[i].productID,
            heap->array[i].quantity,
            heap->array[i].totalAmount,
            heap->array[i].status
        );
    }
}

void freeHeap(struct Heap *heap)
{
    free(heap->array);
    heap->capacity = 0;
    heap->size = 0;
}
