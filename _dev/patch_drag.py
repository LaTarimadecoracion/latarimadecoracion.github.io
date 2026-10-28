paths = ['js/ui/ui-core.js', 'js/ui-core.js']
old_str = "carousel.style.removeProperty('scroll-snap-type');"
new_str = "if (carousel.classList.contains('product-detail-carousel')) { carousel.style.removeProperty('scroll-snap-type'); }"

for p in paths:
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace(old_str, new_str)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("Modificado:", p)
