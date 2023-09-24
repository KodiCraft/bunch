# bun\[c/h\]

[![Run tests](https://github.com/KodiCraft/bunch/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/KodiCraft/bunch/actions/workflows/tests.yml)
![npm](https://img.shields.io/npm/dt/@kodicraft/bunch?logo=npm&label=npm%20downloads)


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

    // Directory in which to store persistent data related to bun[c/h]. Defaults to "./.bunch".
    bunch_dir: "./.bunch",

    // Whether or not to create type declarations for libraries. Recommended when using bun[c/h] with TypeScript. Defaults to true.
    create_d_ts: true,
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

Bun\[c/h\], while technically feature-complete and functional, still provides a couple of drawbacks which may make its usage more difficult (especially when using TypeScript) than I'd like to to be.

### Loaders and LSP
Currently, bun's loaders have no way to tie into your LSP. This means that although bun\[c/h\] generates valid TypeScript, intellisense will not be able to provide proper suggestions. Even worse, your LSP will actually report errors when trying to import header files. 

Because of this, bun\[c/h\] will require you to tinker with your `tsconfig.json` file for a bit to get everything to work properly. You will need to add the following to your `tsconfig.json` file:

```json
{
    "compilerOptions": {
        "typeRoots": ["node_modules/", ".bunch/types/"]
    },

    "paths": {
        "example_library.h": ["./relative/path/to/example_library.h"]
        // ^ This needs to just be the exact name of your header file
        // You will be able to import it directly with the name you specify here
    }
}
```

For this to work, you will have to run your project (and import the header files) at least once before you can get intellisense to work. This is because bun\[c/h\] needs to generate the TypeScript bindings before you can use them.

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