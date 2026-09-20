#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "stack.h"


/* ==========================================
   INITIALIZE STACK
   ========================================== */

void initializeStack(
    struct Stack *stack)
{
    stack->top = NULL;
}


/* ==========================================
   CHECK WHETHER STACK IS EMPTY
   ========================================== */

int isStackEmpty(
    struct Stack *stack)
{
    if (stack->top == NULL)
    {
        return 1;
    }

    return 0;
}


/* ==========================================
   PUSH
   ========================================== */

void push(
    struct Stack *stack,
    struct OrderAction action)
{
    struct StackNode *newNode;


    newNode =
        (struct StackNode*)
        malloc(sizeof(struct StackNode));


    if (newNode == NULL)
    {
        /*
           Do not print here.

           API mode requires stdout to contain
           JSON responses only.
        */

        return;
    }


    newNode->action = action;

    newNode->next = stack->top;

    stack->top = newNode;
}


/* ==========================================
   POP
   ========================================== */

void pop(
    struct Stack *stack)
{
    struct StackNode *temp;


    if (isStackEmpty(stack))
    {
        /*
           Do not print here.

           API mode requires stdout to contain
           JSON responses only.
        */

        return;
    }


    temp = stack->top;


    stack->top =
        stack->top->next;


    free(temp);
}


/* ==========================================
   DISPLAY STACK
   ========================================== */

void displayStack(
    struct Stack *stack)
{
    struct StackNode *current;


    if (isStackEmpty(stack))
    {
        printf(
            "\nUndo history is empty.\n"
        );

        return;
    }


    current = stack->top;


    printf("\n");

    printf(
        "====================================\n"
    );

    printf(
        "            UNDO HISTORY\n"
    );

    printf(
        "====================================\n"
    );


    printf("\nTOP\n");


    while (current != NULL)
    {
        printf(
            "Order %d | %s | Quantity %d -> %d | Stock %d -> %d\n",
            current->action.orderID,
            current->action.actionType,
            current->action.oldQuantity,
            current->action.newQuantity,
            current->action.oldStock,
            current->action.newStock
        );


        current =
            current->next;
    }


    printf("\nBOTTOM\n");
}