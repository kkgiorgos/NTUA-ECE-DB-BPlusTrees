import _ from 'https://cdn.jsdelivr.net/npm/lodash-es@4.17.21/lodash.js';

export class Node {
    constructor() {
        this.values = [];
        this.pointers = [];
        this.next = null;
    }

    is_leaf() {
        return this.pointers.length === 0;
    }

    clone() {
        let node = new Node();
        node.values = _.clone(this.values);
        node.pointers = _.clone(this.pointers);
        node.next = this.next;
        return node;
    }
}

export class BPlusTree {
    constructor(degree) {
        this.root = new Node();
        this.degree = degree;
    }

    get_height() {
        let node = this.root;
        let height = 1;
        while (!node.is_leaf()) {
            node = node.pointers[0];
            height++;
        }
        return height;
    }

    get_leaf_count() {
        let node = this.find_first();
        let count = 0;
        while (node) {
            count++;
            node = node.next;
        }
        return count;
    }

    find(value) {
        let node = this.root;
        while (!node.is_leaf()) {
            let i = node.values.findIndex(v => value <= v);
            if (i === -1) {
                node = node.pointers[node.pointers.length - 1];
            } else if (value === node.values[i]) {
                node = node.pointers[i + 1];
            } else {
                node = node.pointers[i];
            }
        }
        let i = node.values.findIndex(v => value === v);
        if (i === -1) {
            return null;
        } else {
            return {node, i};
        }
    }

    find_first() {
        let node = this.root;
        while (!node.is_leaf()) {
            node = node.pointers[0];
        }
        return node;
    }

    find_should(value) {
        let node = this.root;
        while (!node.is_leaf()) {
            let i = node.values.findIndex(v => value <= v);
            if (i === -1) {
                node = node.pointers[node.pointers.length - 1];
            } else if (value === node.values[i]) {
                node = node.pointers[i + 1];
            } else {
                node = node.pointers[i];
            }
        }
        let i = node.values.findIndex(v => value === v);
        if (i === -1) {
            return node;
        } else {
            return null;
        }
    }

    find_parent(node, value) {
        let parent = this.root;
        while (!parent.is_leaf()) {
            let i = parent.pointers.findIndex(p => p === node);
            if (i === -1) {
                let j = parent.values.findIndex(v => value <= v);
                if (j === -1) {
                    parent = parent.pointers[parent.pointers.length - 1];
                } else if (value === parent.values[j]) {
                    parent = parent.pointers[j + 1];
                } else {
                    parent = parent.pointers[j];
                }
            } else {
                return parent;
            }
        }
        return parent;
    }

    insert_in_leaf (leaf, value) {
        leaf.values.push(value);
        leaf.values.sort((a, b) => a - b);
    }

    insert_in_parent (old_leaf, value, new_leaf) {
        if (old_leaf === this.root) {
            let new_root = new Node();
            new_root.values.push(value);
            new_root.pointers.push(old_leaf);
            new_root.pointers.push(new_leaf);
            this.root = new_root;
            return;
        }

        let parent = this.find_parent(old_leaf, old_leaf.values[0]);
        if (parent.pointers.length < this.degree) {
            let i = parent.pointers.findIndex(p => old_leaf === p);
            parent.values.splice(i, 0, value);
            parent.pointers.splice(i + 1, 0, new_leaf);
        } else {
            // Split the parent
            let temp = parent.clone();//_.clone(parent);

            let i = parent.pointers.findIndex(p => old_leaf === p);
            temp.values.splice(i, 0, value);
            temp.pointers.splice(i + 1, 0, new_leaf);
            
            let new_parent = new Node();
            let mid = Math.ceil((this.degree+1) / 2);

            parent.values = temp.values.slice(0, mid - 1);
            parent.pointers = temp.pointers.slice(0, mid);
            
            new_parent.values = temp.values.slice(mid);
            new_parent.pointers = temp.pointers.slice(mid);

            let key = temp.values[mid-1];
            this.insert_in_parent(parent, key, new_parent);
        }
    }

    insert(value) {
        let leaf;
        if (this.root.values.length === 0) {
            leaf = this.root;
        } else {
            leaf = this.find_should(value);
        }

        if (leaf.values.length < this.degree - 1) {
            this.insert_in_leaf(leaf, value);
        } else {
            //Split the leaf
            let new_leaf = new Node();
            let temp = _.clone(leaf);
            this.insert_in_leaf(temp, value);

            new_leaf.next = leaf.next;
            leaf.next = new_leaf;

            let mid = Math.ceil(this.degree / 2);
            leaf.values = temp.values.slice(0, mid);
            new_leaf.values = temp.values.slice(mid);

            let key = new_leaf.values[0];
            this.insert_in_parent(leaf, key, new_leaf);
        }
    }

    remove_entry(node, value, pointer) {
        let i = node.values.findIndex(v => value === v);
        node.values.splice(i, 1);
        if (pointer !== null) {
            let j = node.pointers.findIndex(p => pointer === p);
            node.pointers.splice(j, 1);
        }
        if (node === this.root) {
            if (node.pointers.length === 1) {
                this.root = node.pointers[0];
            }
        } else if (node.values.length < Math.ceil((this.degree - 1) / 2)
                || (!node.is_leaf() && node.pointers.length < Math.ceil(this.degree / 2))) {
            let parent = this.find_parent(node, value);
            let i = parent.pointers.findIndex(p => p === node);
            let neighbor, key, key_idx;
            if (i === 0) {
                neighbor = parent.pointers[i + 1];
                key = parent.values[i];
                key_idx = i;
            } else {
                neighbor = parent.pointers[i - 1];
                key = parent.values[i - 1];
                key_idx = i - 1;
            }
            if (neighbor.values.length + node.values.length <= this.degree - 1
                    && neighbor.pointers.length + node.pointers.length <= this.degree) {
                // Coalesce Nodes
                if (i === 0) {
                    let temp = node;
                    node = neighbor;
                    neighbor = temp;
                }
                if (!node.is_leaf()) {
                    neighbor.values.push(key);
                    neighbor.values.push(...node.values);
                    neighbor.pointers.push(...node.pointers);
                } else {
                    neighbor.values.push(...node.values);
                    neighbor.next = node.next;
                }
                this.remove_entry(parent, key, node);
            } else {
                // Redistribute Nodes
                if (i !== 0) {
                    if (!node.is_leaf()) {
                        let last_pointer = neighbor.pointers.pop();
                        let last_value = neighbor.values.pop();
                        node.pointers.unshift(last_pointer);
                        node.values.unshift(key);
                        parent.values[key_idx] = last_value;
                    } else {
                        let last_value = neighbor.values.pop();
                        node.values.unshift(last_value);
                        parent.values[key_idx] = last_value;
                    }
                } else {
                    if (!node.is_leaf()) {
                        let first_pointer = neighbor.pointers.shift();
                        let first_value = neighbor.values.shift();
                        node.pointers.push(first_pointer);
                        node.values.push(key);
                        parent.values[key_idx] = first_value;
                    } else {
                        let first_value = neighbor.values.shift();
                        node.values.push(first_value);
                        parent.values[key_idx] = neighbor.values[0];
                    }
                }
            }
        }
    }

    remove(value) {
        let leaf = this.find(value);
        if (leaf === null) {
            return;
        }
        let {node, i} = leaf;
        this.remove_entry(node, value, null);
    }

    print_leaves() {
        let node = this.find_first();
        while (node) {
            console.log(node.values);
            node = node.next;
        }
    }
}