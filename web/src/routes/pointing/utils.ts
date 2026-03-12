export const GRID_COLS = 6;
export const GRID_ROWS = 12;
export const TARGET_SIZES: (22 | 44)[] = [22, 44];
export const MAX_TRIAL = 100;

export interface RectData {
	id: number;
	x: number;
	y: number;
	size: 22 | 44;
	gridX: number;
	gridY: number;
}

export const generateRects = (
	wrapperWidth: number,
	wrapperHeight: number,
): RectData[] => {
	const cellWidth = wrapperWidth / GRID_COLS;
	const cellHeight = wrapperHeight / GRID_ROWS;
	const rects: RectData[] = [];
	let id = 0;

	for (let row = 0; row < GRID_ROWS; row++) {
		for (let col = 0; col < GRID_COLS; col++) {
			// Randomly place within each grid cell
			const size =
				TARGET_SIZES[Math.floor(Math.random() * TARGET_SIZES.length)];
			const x = col * cellWidth + ((cellWidth - size) / 2) * Math.random();
			const y = row * cellHeight + ((cellHeight - size) / 2) * Math.random();

			rects.push({
				id,
				x,
				y,
				size,
				gridX: col,
				gridY: row,
			});
			id++;
		}
	}
	return rects;
};
