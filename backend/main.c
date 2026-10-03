#include <stdio.h>
#include <string.h>

#include "api.h"

/*
   ShopFlow engine entry point.

   The Node.js server starts this program as:   ecommerce api
   You can also run it by hand and type commands, for example:

     VIEW_PRODUCTS
     SKIPLIST
     SEARCH|105
     PLACE_ORDER|101|2|1        (product | quantity | priority 1-3)
     VIEW_QUEUE
     PROCESS_ORDER
     SET_PRIORITY|1001|1
     UNDO
*/
int main(int argc, char *argv[])
{
    if (argc > 1 && strcmp(argv[1], "api") == 0)
    {
        runApiMode();
        return 0;
    }

    fprintf(stderr, "Usage: %s api\n", argv[0]);
    return 1;
}