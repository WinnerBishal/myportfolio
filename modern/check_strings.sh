for file in article1.html article2.html; do
  echo "Checking $file:"
  for string in "Authors" green "ORCID" "mailto:" "DOI:"; do
    if grep -q "$string" "$file"; then
      echo "  [FOUND] $string"
    else
      echo "  [MISSING] $string"
    fi
  done
done
