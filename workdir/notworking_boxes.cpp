#include <Arduino.h>
#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

struct Box {
    int x1, y1, x2, y2;

    int area() const { return (x2 - x1 + 1) * (y2 - y1 + 1); }
    bool overlaps(const Box& other) const {
        return !(x2 < other.x1 || other.x2 < x1 || y2 < other.y1 || other.y2 < y1);
    }
    void merge(const Box& other) {
        x1 = min(x1, other.x1);
        y1 = min(y1, other.y1);
        x2 = max(x2, other.x2);
        y2 = max(y2, other.y2);
    }
};

void bfs(vector<vector<int>>& grid, int x, int y, Box& box, vector<vector<bool>>& visited) {
    int rows = grid.size(), cols = grid[0].size();
    queue<pair<int, int>> q;
    q.push(make_pair(x, y));
    visited[x][y] = true;
    box = {x, y, x, y};
    
    vector<pair<int, int>> directions = {make_pair(1,0), make_pair(-1,0), make_pair(0,1), make_pair(0,-1)};
    while (!q.empty()) {
        pair<int, int> current = q.front(); q.pop();
        int cx = current.first, cy = current.second;
        for (size_t i = 0; i < directions.size(); i++) {
            int nx = cx + directions[i].first, ny = cy + directions[i].second;
            if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && grid[nx][ny] == 1 && !visited[nx][ny]) {
                visited[nx][ny] = true;
                q.push(make_pair(nx, ny));
                box.x1 = min(box.x1, nx);
                box.y1 = min(box.y1, ny);
                box.x2 = max(box.x2, nx);
                box.y2 = max(box.y2, ny);
            }
        }
    }
}

vector<Box> findBoundingBoxes(vector<vector<int>>& grid) {
    int rows = grid.size(), cols = grid[0].size();
    vector<vector<bool>> visited(rows, vector<bool>(cols, false));
    vector<Box> boxes;
    
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < cols; j++) {
            if (grid[i][j] == 1 && !visited[i][j]) {
                Box box;
                bfs(grid, i, j, box, visited);
                boxes.push_back(box);
            }
        }
    }
    
    bool merged;
    do {
        merged = false;
        for (size_t i = 0; i < boxes.size(); i++) {
            for (size_t j = i + 1; j < boxes.size(); j++) {
                if (boxes[i].overlaps(boxes[j])) {
                    boxes[i].merge(boxes[j]);
                    boxes.erase(boxes.begin() + j);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    } while (merged);
    
    return boxes;
}

void reduceBoundingBoxes(vector<Box>& boxes, int N) {
    while (boxes.size() > N) {
        int min_area = INT_MAX, merge_i = -1, merge_j = -1;
        for (size_t i = 0; i < boxes.size(); i++) {
            for (size_t j = i + 1; j < boxes.size(); j++) {
                Box merged = boxes[i];
                merged.merge(boxes[j]);
                int new_area = merged.area();
                if (new_area < min_area) {
                    min_area = new_area;
                    merge_i = i;
                    merge_j = j;
                }
            }
        }
        if (merge_i != -1 && merge_j != -1) {
            boxes[merge_i].merge(boxes[merge_j]);
            boxes.erase(boxes.begin() + merge_j);
        }
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("Ready");
    delay(2000);
    Serial.println("Ok go");

    vector<vector<int>> grid = {
        {0, 1, 1, 0, 0},
        {0, 1, 1, 0, 1},
        {0, 0, 0, 0, 1},
        {1, 1, 0, 0, 1},
        {1, 1, 0, 1, 1}
    };
    
    int N = 2; // Target number of bounding boxes
    vector<Box> boxes = findBoundingBoxes(grid);
    reduceBoundingBoxes(boxes, N);
    
    for (size_t i = 0; i < boxes.size(); i++) {
        Serial.print("Box: ("); Serial.print(boxes[i].x1); Serial.print(", "); Serial.print(boxes[i].y1);
        Serial.print(") to ("); Serial.print(boxes[i].x2); Serial.print(", "); Serial.print(boxes[i].y2);
        Serial.println(")");
    }
}

void loop() {
    // Nothing to do in loop
}
