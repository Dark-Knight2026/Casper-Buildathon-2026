use odra::prelude::*;

#[odra::module]
pub struct StyksPriceFeed {
    twap_price: Var<u64>,
}

#[odra::module]
impl StyksPriceFeed {
    pub fn set_twap_price(&mut self, twap_price: u64) {
        self.twap_price.set(twap_price);
    }

    #[allow(unused_variables)]
    pub fn get_twap_price(&self, id: &String) -> Option<u64> {
        self.twap_price.get()
    }
}
