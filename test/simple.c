#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>

#include "simple.h"

    extern void no_type() {
        //printf("no_type()\n");
    }

    extern int binnum(int a, int b) {
        //printf("binnum(%d, %d)\n", a, b);
        return a + b;
    }

    extern char* split(char* str, char* delim) {
        //printf("split(%s, %s)\n", str, delim);
        return str;
    }

    extern char* to_string(int num) {
        //printf("to_string(%d)\n", num);
        return "123";
    }

    extern int to_int(char* str) {
        //printf("to_int(%s)\n", str);
        return 123;
    }

    extern bool is_prime(int num) {
        //printf("is_prime(%d)\n", num);
        return true;
    }

    extern uint8_t* to_bytes(int num) {
        //printf("to_bytes(%d)\n", num);
        return (uint8_t*) "123";
    }

    extern point* make_point(int x, int y) {
        //printf("make_point(%d, %d)\n", x, y);
        point* p = malloc(sizeof(point));
        p->x = x;
        p->y = y;
        return p;
    }    

    extern long long weird_types(unsigned long int a, long long int b, unsigned int c) {
        //printf("weird_types(%lu, %lld, %u)\n", a, b, c);
        return a + b + c;
    }