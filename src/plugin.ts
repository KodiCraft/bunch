import { plugin } from "bun";
import bunch from ".";

plugin(bunch({
    lib_dirs: ["./test"],
    honor_ld_preload: false
}))