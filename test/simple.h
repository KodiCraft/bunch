// Simple test header file with a couple of functions

#ifndef SIMPLE_H
#define SIMPLE_H

#include <stdbool.h>
#include <stdint.h>

/// @brief A simple function with no parameters and that returns nothing
void no_type();

/// @brief This function takes two numbers and returns another number
/// @param a A first number
/// @param b A second number
/// @return A value of some kind
int binnum(int a, int b);

// Next are some sample functions
char* split(char* str, char* delim);
char* to_string(int num);
int to_int(char* str);
bool is_prime(int num);

uint8_t* to_bytes(int num);

typedef struct {
    int x;
    int y;
} point;

point* make_point(int x, int y);

long long weird_types(unsigned long int a, long long int b, unsigned int c);

#endif // SIMPLE_H
