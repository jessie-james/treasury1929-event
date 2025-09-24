{pkgs}: {
  deps = [
    pkgs.dig
    pkgs.psmisc
    pkgs.stress-ng
    pkgs.jq
    pkgs.zip
    pkgs.postgresql
  ];
}
