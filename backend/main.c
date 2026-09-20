#include <stdio.h>
#include <string.h>

#include "bst.h"
#include "queue.h"
#include "stack.h"
#include "history.h"
#include "api.h"

/* ==========================================
   FUNCTION: ADD PRODUCT
   ========================================== */

void addProduct(
    struct Product **root)
{
    int id;
    char name[50];
    float price;
    int stock;


    printf("\n====================================\n");
    printf("           ADD PRODUCT\n");
    printf("====================================\n");


    printf("Enter Product ID: ");
    scanf("%d", &id);


    printf("Enter Product Name: ");
    scanf(" %49[^\n]", name);


    printf("Enter Price: ");
    scanf("%f", &price);


    printf("Enter Stock: ");
    scanf("%d", &stock);


    *root = insertProduct(
        *root,
        id,
        name,
        price,
        stock
    );


    printf("\nProduct added successfully!\n");
}


/* ==========================================
   FUNCTION: SEARCH PRODUCT MENU
   ========================================== */

void searchProductMenu(
    struct Product *root)
{
    int id;

    struct Product *product;


    printf("\n====================================\n");
    printf("          SEARCH PRODUCT\n");
    printf("====================================\n");


    printf("Enter Product ID: ");
    scanf("%d", &id);


    product = searchProduct(
        root,
        id
    );


    if (product != NULL)
    {
        printf("\nProduct Found!\n");
        printf("-----------------------------\n");


        printf(
            "Product ID : %d\n",
            product->productID
        );


        printf(
            "Name       : %s\n",
            product->name
        );


        printf(
            "Price      : %.2f\n",
            product->price
        );


        printf(
            "Stock      : %d\n",
            product->stock
        );
    }
    else
    {
        printf("\nProduct not found.\n");
    }
}


/* ==========================================
   FUNCTION: PLACE ORDER
   ========================================== */

void placeOrder(
    struct Product *root,
    struct Queue *orderQueue,
    int *nextOrderID)
{
    int productID;
    int quantity;

    struct Product *product;

    struct Order order;


    printf("\n====================================\n");
    printf("            PLACE ORDER\n");
    printf("====================================\n");


    printf("Enter Product ID: ");
    scanf("%d", &productID);


    product = searchProduct(
        root,
        productID
    );


    if (product == NULL)
    {
        printf("\nProduct not found.\n");
        return;
    }


    printf(
        "\nProduct: %s\n",
        product->name
    );


    printf(
        "Price: %.2f\n",
        product->price
    );


    printf(
        "Available Stock: %d\n",
        product->stock
    );


    printf("\nEnter Quantity: ");
    scanf("%d", &quantity);


    if (quantity <= 0)
    {
        printf("Invalid quantity.\n");
        return;
    }


    if (quantity > product->stock)
    {
        printf("Insufficient stock.\n");
        return;
    }


    order.orderID =
        *nextOrderID;


    order.productID =
        productID;


    order.quantity =
        quantity;


    order.totalAmount =
        product->price * quantity;


    strcpy(
        order.status,
        "Pending"
    );


    enqueue(
        orderQueue,
        order
    );


    product->stock =
        product->stock - quantity;


    printf("\n====================================\n");
    printf("          ORDER CONFIRMED\n");
    printf("====================================\n");


    printf(
        "Order ID     : %d\n",
        order.orderID
    );


    printf(
        "Product      : %s\n",
        product->name
    );


    printf(
        "Quantity     : %d\n",
        quantity
    );


    printf(
        "Total Amount : %.2f\n",
        order.totalAmount
    );


    (*nextOrderID)++;
}


/* ==========================================
   FUNCTION: EDIT ORDER
   ========================================== */

void editOrder(
    struct Product *productRoot,
    struct Queue *orderQueue,
    struct Stack *undoStack)
{
    int orderID;
    int newQuantity;

    struct QueueNode *orderNode;
    struct Product *product;

    struct OrderAction action;

    int quantityDifference;


    printf("\n====================================\n");
    printf("             EDIT ORDER\n");
    printf("====================================\n");


    printf("Enter Order ID: ");
    scanf("%d", &orderID);


    orderNode =
        findOrder(
            orderQueue,
            orderID
        );


    if (orderNode == NULL)
    {
        printf("\nOrder not found.\n");
        return;
    }


    product =
        searchProduct(
            productRoot,
            orderNode->order.productID
        );


    if (product == NULL)
    {
        printf("\nProduct not found.\n");
        return;
    }


    printf(
        "\nCurrent Quantity : %d\n",
        orderNode->order.quantity
    );


    printf(
        "Current Amount   : %.2f\n",
        orderNode->order.totalAmount
    );


    printf(
        "Current Stock    : %d\n",
        product->stock
    );


    printf("\nEnter New Quantity: ");
    scanf("%d", &newQuantity);


    if (newQuantity <= 0)
    {
        printf("\nInvalid quantity.\n");
        return;
    }


    quantityDifference =
        newQuantity -
        orderNode->order.quantity;


    if (quantityDifference > 0)
    {
        if (quantityDifference > product->stock)
        {
            printf(
                "\nInsufficient stock for this edit.\n"
            );

            return;
        }
    }


    action.orderID =
        orderID;


    strcpy(
        action.actionType,
        "Quantity Changed"
    );


    action.productID =
        orderNode->order.productID;


    action.oldQuantity =
        orderNode->order.quantity;


    action.newQuantity =
        newQuantity;


    action.oldAmount =
        orderNode->order.totalAmount;


    action.newAmount =
        product->price * newQuantity;


    action.oldStock =
        product->stock;


    action.newStock =
        product->stock -
        quantityDifference;


    push(
        undoStack,
        action
    );


    orderNode->order.quantity =
        newQuantity;


    orderNode->order.totalAmount =
        action.newAmount;


    product->stock =
        action.newStock;


    printf("\n====================================\n");
    printf("        ORDER UPDATED SUCCESSFULLY\n");
    printf("====================================\n");


    printf(
        "Order ID       : %d\n",
        orderID
    );


    printf(
        "New Quantity   : %d\n",
        newQuantity
    );


    printf(
        "New Amount     : %.2f\n",
        action.newAmount
    );


    printf(
        "Remaining Stock: %d\n",
        product->stock
    );
}


/* ==========================================
   FUNCTION: UNDO LAST ACTION
   ========================================== */

void undoLastChange(
    struct Product *productRoot,
    struct Queue *orderQueue,
    struct Stack *undoStack)
{
    struct Product *product;

    struct QueueNode *orderNode;

    struct Order restoredOrder;

    int orderID;


    if (isStackEmpty(undoStack))
    {
        printf(
            "\nNo changes available to undo.\n"
        );

        return;
    }


    orderID =
        undoStack->top->action.orderID;


    /* =====================================
       HANDLE QUANTITY EDIT
       ===================================== */

    if (
        strcmp(
            undoStack->top->action.actionType,
            "Quantity Changed"
        ) == 0
    )
    {
        orderNode =
            findOrder(
                orderQueue,
                orderID
            );


        if (orderNode == NULL)
        {
            printf(
                "\nOrder no longer exists.\n"
            );

            pop(undoStack);

            return;
        }


        product =
            searchProduct(
                productRoot,
                orderNode->order.productID
            );


        if (product == NULL)
        {
            printf(
                "\nProduct no longer exists.\n"
            );

            pop(undoStack);

            return;
        }


        orderNode->order.quantity =
            undoStack->top->action.oldQuantity;


        orderNode->order.totalAmount =
            undoStack->top->action.oldAmount;


        product->stock =
            undoStack->top->action.oldStock;


        printf("\n====================================\n");
        printf("         UNDO EDIT SUCCESSFUL\n");
        printf("====================================\n");


        printf(
            "Order ID        : %d\n",
            orderID
        );


        printf(
            "Restored Qty    : %d\n",
            orderNode->order.quantity
        );


        printf(
            "Restored Amount : %.2f\n",
            orderNode->order.totalAmount
        );


        printf(
            "Restored Stock  : %d\n",
            product->stock
        );
    }


    /* =====================================
       HANDLE ORDER CANCELLATION
       ===================================== */

    else if (
        strcmp(
            undoStack->top->action.actionType,
            "Order Cancelled"
        ) == 0
    )
    {
        product =
            searchProduct(
                productRoot,
                undoStack->top->action.productID
            );


        if (product == NULL)
        {
            printf(
                "\nProduct no longer exists.\n"
            );

            pop(undoStack);

            return;
        }


        restoredOrder.orderID =
            undoStack->top->action.orderID;


        restoredOrder.productID =
            undoStack->top->action.productID;


        restoredOrder.quantity =
            undoStack->top->action.oldQuantity;


        restoredOrder.totalAmount =
            undoStack->top->action.oldAmount;


        strcpy(
            restoredOrder.status,
            "Pending"
        );


        enqueue(
            orderQueue,
            restoredOrder
        );


        product->stock =
            undoStack->top->action.oldStock;


        printf("\n====================================\n");
        printf("      UNDO CANCELLATION SUCCESSFUL\n");
        printf("====================================\n");


        printf(
            "Order ID       : %d\n",
            restoredOrder.orderID
        );


        printf(
            "Quantity       : %d\n",
            restoredOrder.quantity
        );


        printf(
            "Amount         : %.2f\n",
            restoredOrder.totalAmount
        );


        printf(
            "Stock Restored : %d\n",
            product->stock
        );
    }


    pop(undoStack);
}


/* ==========================================
   FUNCTION: CANCEL ORDER
   ========================================== */

void cancelOrderMenu(
    struct Product *productRoot,
    struct Queue *orderQueue,
    struct Stack *undoStack)
{
    int orderID;

    struct QueueNode *orderNode;

    struct Product *product;

    struct OrderAction action;


    printf("\n====================================\n");
    printf("            CANCEL ORDER\n");
    printf("====================================\n");


    printf("Enter Order ID: ");
    scanf("%d", &orderID);


    orderNode =
        findOrder(
            orderQueue,
            orderID
        );


    if (orderNode == NULL)
    {
        printf("\nOrder not found.\n");
        return;
    }


    product =
        searchProduct(
            productRoot,
            orderNode->order.productID
        );


    if (product == NULL)
    {
        printf("\nProduct not found.\n");
        return;
    }


    action.orderID =
        orderID;


    strcpy(
        action.actionType,
        "Order Cancelled"
    );


    action.productID =
        orderNode->order.productID;


    action.oldQuantity =
        orderNode->order.quantity;


    action.newQuantity =
        0;


    action.oldAmount =
        orderNode->order.totalAmount;


    action.newAmount =
        0;


    action.oldStock =
        product->stock;


    action.newStock =
        product->stock +
        orderNode->order.quantity;


    push(
        undoStack,
        action
    );


    product->stock =
        action.newStock;


    cancelOrder(
        orderQueue,
        orderID
    );


    printf("\n====================================\n");
    printf("          ORDER CANCELLED\n");
    printf("====================================\n");


    printf(
        "Order ID       : %d\n",
        orderID
    );


    printf(
        "Product ID     : %d\n",
        action.productID
    );


    printf(
        "Quantity       : %d\n",
        action.oldQuantity
    );


    printf(
        "Refund Amount  : %.2f\n",
        action.oldAmount
    );


    printf(
        "Stock Restored : %d\n",
        product->stock
    );
}


/* ==========================================
   MAIN FUNCTION
   ========================================== */

int main(int argc,char *argv[])
{
    if (argc > 1 &&
    strcmp(argv[1], "api") == 0)
{
    runApiMode();

    return 0;
}

    struct Product *productRoot = NULL;

    struct Queue orderQueue;

    struct Stack undoStack;

    struct OrderHistory orderHistory;

    int nextOrderID = 1001;

    int choice;


    initializeQueue(
        &orderQueue
    );


    initializeStack(
        &undoStack
    );


    initializeHistory(
        &orderHistory
    );


    /* =====================================
       DEFAULT PRODUCTS
       ===================================== */

    productRoot = insertProduct(
        productRoot,
        101,
        "Smartphone",
        30000,
        15
    );


    productRoot = insertProduct(
        productRoot,
        103,
        "Keyboard",
        1500,
        20
    );


    productRoot = insertProduct(
        productRoot,
        105,
        "Laptop",
        65000,
        10
    );


    productRoot = insertProduct(
        productRoot,
        108,
        "Smartwatch",
        5000,
        12
    );


    productRoot = insertProduct(
        productRoot,
        110,
        "Headphones",
        2500,
        25
    );


    /* =====================================
       MAIN MENU
       ===================================== */

    do
    {
        printf("\n\n");
        printf("============================================\n");
        printf("       E-COMMERCE ORDER MANAGEMENT\n");
        printf("============================================\n");


        printf("\n1. Add Product");
        printf("\n2. Search Product");
        printf("\n3. Display Products");
        printf("\n4. Place Order");
        printf("\n5. View Order Queue");
        printf("\n6. Process Next Order");
        printf("\n7. Edit Order");
        printf("\n8. Cancel Order");
        printf("\n9. Undo Last Action");
        printf("\n10. View Undo History");
        printf("\n11. View Order History");
        printf("\n12. Exit");


        printf("\n\nEnter your choice: ");
        scanf("%d", &choice);


        switch(choice)
        {
            case 1:

                addProduct(
                    &productRoot
                );

                break;


            case 2:

                searchProductMenu(
                    productRoot
                );

                break;


            case 3:

                printf(
                    "\n====================================\n"
                );

                printf(
                    "          PRODUCT CATALOG\n"
                );

                printf(
                    "====================================\n"
                );


                displayProducts(
                    productRoot
                );

                break;


            case 4:

                placeOrder(
                    productRoot,
                    &orderQueue,
                    &nextOrderID
                );

                break;


            case 5:

                displayQueue(
                    &orderQueue
                );

                break;


            case 6:
            {
                struct QueueNode *frontOrder;


                if (isQueueEmpty(&orderQueue))
                {
                    printf(
                        "\nNo pending orders.\n"
                    );
                }
                else
                {
                    frontOrder =
                        orderQueue.front;


                    addToHistory(
                        &orderHistory,
                        frontOrder->order
                    );


                    dequeue(
                        &orderQueue
                    );
                }


                break;
            }


            case 7:

                editOrder(
                    productRoot,
                    &orderQueue,
                    &undoStack
                );

                break;


            case 8:

                cancelOrderMenu(
                    productRoot,
                    &orderQueue,
                    &undoStack
                );

                break;


            case 9:

                undoLastChange(
                    productRoot,
                    &orderQueue,
                    &undoStack
                );

                break;


            case 10:

                displayStack(
                    &undoStack
                );

                break;


            case 11:

                displayHistory(
                    &orderHistory
                );

                break;


            case 12:

                printf(
                    "\nThank you for using the system!\n"
                );

                break;


            default:

                printf(
                    "\nInvalid choice. Please try again.\n"
                );
        }

    } while(choice != 12);


    /* =====================================
       CLEAN UP HISTORY MEMORY
       ===================================== */

    freeHistory(
        &orderHistory
    );


    return 0;
}