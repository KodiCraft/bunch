 #include <stdbool.h> 

int func(int a, int b);
void func2();
char* func3(char* str, char* delim);
char* func4(int num);
int func5(char* str);
float func6(int num);

// This is a bit of a conundrum.
// `uint8_t` isn't a built-in but bun is capable of handling it separately from
// `char`. Because of this, we expect func7 to return a `u8` and not a `char`
// despite the fact that `uint8_t` is defined as `char`.
typedef char uint8_t;
uint8_t func7(int num);