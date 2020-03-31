### Install Rustup

Visit [https://rustup.rs/](https://rustup.rs/) to download Rust for your operating system.

### Add the WASM target

```
rustup target add wasm32-unknown-unknown
```

### Install wasm-pack

```
cargo install wasm-pack
```

### Build the package

```
cargo build --release --target wasm32-unknown-unknown
```

### Minify the package

```
brew install binaryen
```
