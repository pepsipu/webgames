pub struct RingBuffer<T> {
    values: Vec<Option<T>>,
    head: usize,
    len: usize,
    dropped: u64,
}

impl<T> RingBuffer<T> {
    pub fn new(capacity: usize) -> Self {
        let next_capacity = capacity.max(1);
        let mut values = Vec::with_capacity(next_capacity);
        values.resize_with(next_capacity, || None);

        Self {
            values,
            head: 0,
            len: 0,
            dropped: 0,
        }
    }

    pub fn capacity(&self) -> usize {
        self.values.len()
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn dropped_count(&self) -> u64 {
        self.dropped
    }

    pub fn clear(&mut self) {
        while self.pop().is_some() {}
    }

    pub fn push(&mut self, value: T) {
        let capacity = self.values.len();
        if self.len == capacity {
            self.values[self.head] = Some(value);
            self.head = (self.head + 1) % capacity;
            self.dropped += 1;
            return;
        }

        let index = (self.head + self.len) % capacity;
        self.values[index] = Some(value);
        self.len += 1;
    }

    pub fn pop(&mut self) -> Option<T> {
        if self.len == 0 {
            return None;
        }

        let value = self.values[self.head].take();
        self.head = (self.head + 1) % self.values.len();
        self.len -= 1;
        value
    }
}
