#ifndef ORDER_H
#define ORDER_H

#define PRIORITY_EXPRESS  1
#define PRIORITY_STANDARD 2
#define PRIORITY_ECONOMY  3

struct Order
{
    int orderID;
    int productID;
    int quantity;
    float totalAmount;

    int priority;            /* 1 = Express, 2 = Standard, 3 = Economy */
    unsigned long sequence;  /* arrival number: breaks ties inside a priority */

    char status[20];
};

#endif