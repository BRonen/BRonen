{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs.nodePackages; [
    nodejs
    pnpm
  ];
}
