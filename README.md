# bun\[c/h\]

bun\[c/h\] (pronounced "bunch") is a [bun](https://bun.sh/) plugin that allows you to automatically import and link C/C++ libraries via C header files.

## Installation

Bun\[c/h\] depends on [clang](https://clang.llvm.org/) for parsing C/C++ header files. `clang` must be in your path for bun\[c/h\] to work.

On linux, install `clang` with your distribution's package manager.
```sh
# Debian/Ubuntu
sudo apt install clang
# Arch
sudo pacman -S clang
# etc. you're smart enough to figure it out
```

On macOS, `clang` is provided by the xcode command line tools.
```sh
xcode-select --install
```

On windows, you can grab `clang` from [LLVM's releases page](https://llvm.org/builds/). Make sure to add its directory to your PATH.

Then, add bun\[c/h\] to your project

```sh
bun add @kodicraft/bunch
```


## Usage

### Loading the plugin
To use bun\[c/h\] in your project, create a file to store plugin configuration. If you don't have one already, create a file called `plugins.ts` or `plugins.js` in your project's root directory. Then, add the following to the file:

```ts
import bunch from "bunch";
import { plugin } from "bun";

plugin(bunch({
    // Where to find libraries. Bun[c/h] will search for a library with the same name as the header in each directory in order. Defaults to ["/usr/lib", "/usr/local/lib""]
    lib_dirs: ["path/to/libraries"],

    // Whether to honor the LD_PRELOAD environment variable. If true, bun[c/h] will search for libraries in the directories specified by LD_PRELOAD before searching in the directories specified by lib_dirs. Defaults to true.
    honor_ld_preload: true,

    // If set, force bun[c/h] to use a specific file extension for libraries instead of using your OS's default. Defaults to undefined.
    lib_ext: "so",
}));
```

You may play around with the config to get something that works for you.

Then, add `plugins.ts`/`plugins.js` to your `bunfig.toml` file:

```toml
preload = ["plugins.ts"]

[test]
preload = ["plugins.ts"]
```

### Importing libraries
To import a library, simply import the library's header file like you would any other module:

```ts
import { function } from "simple.h";
```

Functions defined in `simple.h` are now available to call. Bun will automatically handle linking the library and loading the functions.

Note that there is do `default` export yet, but plans are in the works to add one.

## Issues

Bun\[c/h\] isn't actually ready for production yet, and this is due to a couple of issues relating to now bun's loaders work. Not only that, but bun\[c/h\] provides rather low-level bindings which, while technically type-safe, are not very ergonomic to call from TypeScript.

### Loaders and LSP
Currently, bun's loaders have no way to tie into your LSP. This means that although bun\[c/h\] generates valid TypeScript, intellisense will not be able to provide proper suggestions. Even worse, your LSP will actually report errors when trying to import header files. 

This is in part because bun simply has no way to directly integrate with your LSP. This would be a challenging problem to tackle that bun may not want to, and maybe someone might one day create a bun-compatible LSP that can handle this, but currently it creates a rather poor experience with bun\[c/h\].

### Import arguments and multi-header libraries
A common pattern with large libraries is allowing you to include multiple different headers that provide different functionality. For example, the [SDL2](https://www.libsdl.org/) library provides a header called `SDL.h` that provides the core functionality of the library, but also provides headers like `SDL_image.h` and `SDL_ttf.h` that provide additional functionality. All of these files have different names but you are only meant to import `libSDL2.so` once.

You might also notice that it is a bit weird for bun\[c/h\] to expect your header file and library to have the same name save for the extension. Ideally, they should be separate, however, that is not currently possible to achieve in bun.

Bun custom loaders are not able, to my knowledge, of getting any extra information other than the file name of the file being imported. This means that bun\[c/h\] has no way of knowing what library to link to when you import `SDL_image.h` or `SDL_ttf.h`.

An idea I considered was to allow you to specify the library to link to in the import statement, like so:

```ts
import { /* ... */ } from "SDL_image.h:libSDL2";
```

However, due to [the way bun has to handle modules](https://bun.sh/docs/runtime/modules), it is not possible to do this. Bun needs imported file names to be real file names, meaning we can't "smuggle" in extra data in the file name.

## Contributing

For information on contributing, see [CONTRIBUTING.md](CONTRIBUTING.md). This file will describe how to set up your development environment, run and write tests, and submit a pull request.

## License

Bun\[c/h\] is licensed under the [MIT](LICENSE), similarly to Bun. LLVM (including clang) which this project depends on is licensed under the [Apache 2.0](https://llvm.org/foundation/relicensing/LICENSE.txt) license.