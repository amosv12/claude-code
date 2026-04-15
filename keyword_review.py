"""
keyword_review.py — Scan text files for one or more keywords and report all matches.

Usage examples:
  python keyword_review.py error warning --files *.log
  python keyword_review.py test --files sample.txt --output out.csv
  python keyword_review.py TODO FIXME --files src/*.py --case-sensitive
"""

import argparse
import collections
import csv
import glob
import sys


def parse_args():
    parser = argparse.ArgumentParser(
        description="Scan text files for user-defined keywords and report matches."
    )
    parser.add_argument(
        "keywords",
        nargs="+",
        help="One or more keywords to search for.",
    )
    parser.add_argument(
        "--files",
        nargs="+",
        required=True,
        metavar="PATTERN",
        help="Glob patterns for files to scan (e.g. *.txt logs/*.log).",
    )
    parser.add_argument(
        "--case-sensitive",
        action="store_true",
        help="Perform a case-sensitive search (default is case-insensitive).",
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        help="Write matches to a CSV file.",
    )
    return parser.parse_args()


def resolve_files(patterns):
    """Expand glob patterns into a deduplicated, sorted list of file paths."""
    seen = {}
    for pattern in patterns:
        matches = glob.glob(pattern)
        if not matches:
            print(f"Warning: no files matched pattern '{pattern}'", file=sys.stderr)
        for path in matches:
            seen[path] = None
    return sorted(seen.keys())


def scan_file(path, keywords, case_sensitive):
    """
    Scan a single file for keyword matches.

    Returns a list of dicts with keys: file, line_no, keyword, line.
    Prints a warning and returns [] on any file-access or permission error.
    """
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            lines = fh.readlines()
    except FileNotFoundError:
        print(f"Warning: file not found: '{path}'", file=sys.stderr)
        return []
    except PermissionError:
        print(f"Warning: permission denied: '{path}'", file=sys.stderr)
        return []

    matches = []
    for line_no, raw_line in enumerate(lines, start=1):
        line = raw_line.rstrip()
        haystack = line if case_sensitive else line.lower()
        for keyword in keywords:
            needle = keyword if case_sensitive else keyword.lower()
            if needle in haystack:
                matches.append(
                    {
                        "file": path,
                        "line_no": line_no,
                        "keyword": keyword,
                        "line": line,
                    }
                )
    return matches


def print_matches(matches):
    """Print each match as: filename · line_no · keyword · line."""
    for m in matches:
        print(f"{m['file']} \u00b7 {m['line_no']} \u00b7 {m['keyword']} \u00b7 {m['line']}")


def write_csv(matches, output_path):
    """Write matches to a CSV file with headers: file, line_no, keyword, line."""
    try:
        with open(output_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(
                fh, fieldnames=["file", "line_no", "keyword", "line"]
            )
            writer.writeheader()
            writer.writerows(matches)
        print(f"Results written to '{output_path}'.")
    except PermissionError:
        print(
            f"Warning: permission denied writing to '{output_path}'. CSV not saved.",
            file=sys.stderr,
        )


def print_summary(all_files, keywords, matches):
    """Print end-of-run statistics."""
    files_with_matches = {m["file"] for m in matches}
    zero_match_files = [f for f in all_files if f not in files_with_matches]
    keyword_counts = collections.Counter(m["keyword"] for m in matches)

    print("\n--- Summary ---")
    print(f"Files scanned  : {len(all_files)}")
    print("Matches per keyword:")
    for kw in keywords:
        print(f"  {kw:<20}: {keyword_counts.get(kw, 0)}")
    if zero_match_files:
        print("Files with no matches:")
        for f in zero_match_files:
            print(f"  {f}")
    else:
        print("Files with no matches: (none)")


def main():
    args = parse_args()

    all_files = resolve_files(args.files)

    all_matches = []
    for path in all_files:
        file_matches = scan_file(path, args.keywords, args.case_sensitive)
        all_matches.extend(file_matches)

    print_matches(all_matches)

    if args.output:
        write_csv(all_matches, args.output)

    print_summary(all_files, args.keywords, all_matches)


if __name__ == "__main__":
    main()
