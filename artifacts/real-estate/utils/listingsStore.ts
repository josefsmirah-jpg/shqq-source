let _listings: any[] = [];
let _startIndex: number = 0;
let _isAdmin: boolean = false;
let _autoExport: boolean = false;

export function setListingsForViewer(
  listings: any[],
  startIndex: number,
  isAdmin = false,
  autoExport = false,
) {
  _listings = listings;
  _startIndex = startIndex;
  _isAdmin = isAdmin;
  _autoExport = autoExport;
}

export function getListingsForViewer() {
  return {
    listings: _listings,
    startIndex: _startIndex,
    isAdmin: _isAdmin,
    autoExport: _autoExport,
  };
}

// مخزن الإعلان المراد تعديله
let _listingToEdit: any | null = null;

export function setListingToEdit(listing: any) {
  _listingToEdit = listing;
}

export function getListingToEdit(): any | null {
  return _listingToEdit;
}

export function clearListingToEdit() {
  _listingToEdit = null;
}
