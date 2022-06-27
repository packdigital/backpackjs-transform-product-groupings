const uniq = (...values) => [...new Set(values.flat())];

const mapFromGrouping = function mapFromGrouping(item) {
  return {
    ...item,
    fromGrouping: this,
  };
};

const mapGroupedProductField = function mapGroupedProductField(groupedProduct) {
  return groupedProduct[this];
};

const mergeGroupingProductHandles = (product) => {
  if (!product.grouping) return product;

  const { grouping } = product;
  const { products, subgroups } = grouping;
  const mapHandles = ({ handle }) => handle;

  return {
    ...product,
    grouping: {
      ...grouping,
      products: [
        ...products.map(mapHandles),
        ...subgroups.flatMap((subgroup) => subgroup.products.map(mapHandles)),
      ],
    },
  };
};

const removeSelfFromGrouping = (product) => {
  if (!product.grouping) return product;

  const { grouping } = product;
  const { products } = grouping;

  return {
    ...product,
    grouping: {
      ...grouping,
      products: products.filter((handle) => handle !== product.handle),
    },
  };
};

const attachGroupedData = function attachGroupedData(product) {
  if (!product.grouping) return product;

  const getProductByHandle = (handleA) =>
    this.find(({ handle: handleB }) => handleA === handleB);

  const groupedProducts = product.grouping.products
    .map(getProductByHandle)
    .filter(Boolean);

  const variants = [
    ...product.variants.map(mapFromGrouping, false),
    ...groupedProducts
      .flatMap(mapGroupedProductField, 'variants')
      .map(mapFromGrouping, true),
  ];

  const groupOptionsMap = groupedProducts.reduce((map, { optionsMap }) => {
    return Object.entries(optionsMap).reduce((submap, [key, values]) => {
      return {
        ...submap,
        [key]: uniq(submap[key] || [], values),
      };
    }, map);
  }, product.optionsMap);

  return {
    ...product,
    variants,
    groupOptionsMap,
    images: [
      ...product.images.map(mapFromGrouping, false),
      ...groupedProducts
        .flatMap(mapGroupedProductField, 'images')
        .map(mapFromGrouping, true),
    ],
    media: [
      ...product.media.map(mapFromGrouping, false),
      ...groupedProducts
        .flatMap(mapGroupedProductField, 'media')
        .map(mapFromGrouping, true),
    ],
    totalVariants: variants.length,
    totalInventory: groupedProducts.reduce(
      (total, { totalInventory }) => total + totalInventory,
      product.totalInventory
    ),
  };
};

module.exports = (input) => {
  const { products, collections } = input;

  const result = {
    products: products
      .map(mergeGroupingProductHandles)
      .map(removeSelfFromGrouping)
      .map(attachGroupedData, products),
    collections,
  };

  return result;
};
