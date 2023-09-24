# Contributing

## Setting up the sources

First, clone the repository:

```sh
git clone git@github:KodiCraft/bun.git
```

Then, install the dependencies:

```sh
bun install
```

## Running tests

> [!IMPORTANT]
> For testing purposes, a simple C library named `simple` is provided. For tests to succeed, you must first compile this library and then run the tests. On Linux, a precompiled .so file is already provided in the source tree (which I generate on my machine).

> [!NOTE]
> You may skip these tests if you are unable or unwilling to compile the library. However, all tests must pass for a pull request to be accepted. To skip them, navigate to `test/main.test.js` and replace the first two `test` calls to `test.skip`.

For `gcc` users on linux, a helper script `buildso.sh` is provided in the test directory. To compile the library, run:

```sh
test/buildso.sh test/simple
```

On MacOS or Windows, you will have to use your own C compiler to create a system-appropriate library file.

To run the tests, run:

```sh
bun test
```

While adding new features, you might want to write your own tests. We aim for 90% test coverage. To run the tests in watch mode, run:

```sh
bun test --watch
```

## Commit messages

bun\[c/h\] uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages. We are not strict about this, but following the guidelines helps us keep our commit history clean and readable.

## Submitting a pull request

When submitting a pull request, please include a description of the changes you made and why you made them. If your pull request fixes an issue, please include a link to the issue in the description.

Pull requests will automatically run the test suite and lint the code. If either of these fail, your pull request will be rejected. If you are having trouble, we will be happy to help you help us help us all.

## Versioning

When bun\[c/h\] is ready to release a new version, a few things need to happen:
- Updating the version number in the `package.json` file
- Creating a new tag with the version number
- Publishing the new version to npm

These must be done manually for now, but we hope to automate this process in the future.