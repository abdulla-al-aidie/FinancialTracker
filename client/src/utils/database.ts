/**
 * Saves data to the Replit Database with a timestamp
 * @param key The key to store the data under (will be prefixed)
 * @param data The data to store
 * @returns Promise that resolves when data is saved
 */
export const saveToDb = async (key: string, data: any): Promise<void> => {
  try {
    const response = await fetch('/api/replit-db/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, data }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save data');
    }
  } catch (error) {
    console.error(`Error saving ${key} to database:`, error);
    throw error;
  }
};

/**
 * Gets data from the Replit Database
 * @param key The key to retrieve
 * @returns Promise that resolves with the data, or null if not found
 */
export const getFromDb = async (key: string): Promise<any> => {
  try {
    const response = await fetch(`/api/replit-db/get/${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to retrieve data');
    }
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Error retrieving ${key} from database:`, error);
    return null;
  }
};

/**
 * Gets the last auto-save timestamp
 * @returns Promise that resolves with the timestamp as a string
 */
export const getLastSaveTime = async (): Promise<string | null> => {
  try {
    const response = await fetch('/api/replit-db/last-save-time');
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get last save time');
    }
    
    const result = await response.json();
    return result.timestamp;
  } catch (error) {
    console.error("Error retrieving last save time:", error);
    return null;
  }
};

/**
 * Deletes data from the Replit Database
 * @param key The key to delete
 * @returns Promise that resolves when key is deleted
 */
export const deleteFromDb = async (key: string): Promise<void> => {
  try {
    const response = await fetch(`/api/replit-db/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete data');
    }
  } catch (error) {
    console.error(`Error deleting ${key} from database:`, error);
    throw error;
  }
};

/**
 * Lists all keys with a specific prefix in the database
 * @param prefix The prefix to filter keys by
 * @returns Promise that resolves with an array of matching keys
 */
export const listDbKeys = async (prefix: string = ''): Promise<string[]> => {
  try {
    const response = await fetch(`/api/replit-db/list/${encodeURIComponent(prefix)}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to list keys');
    }
    
    const result = await response.json();
    return result.keys || [];
  } catch (error) {
    console.error(`Error listing database keys with prefix ${prefix}:`, error);
    return [];
  }
};

/**
 * Save localStorage data to Replit DB
 */
export const saveFromLocalStorage = async (): Promise<void> => {
  try {
    // Collect all data to save in a single object
    const dataToSave: Record<string, any> = {};
    
    // Save common keys
    const keysToSave = [
      'months', 'goals', 'debts', 'scenarios', 'userProfile'
    ];
    
    for (const key of keysToSave) {
      const data = localStorage.getItem(key);
      if (data) {
        dataToSave[key] = JSON.parse(data);
      }
    }
    
    // Save month-specific data
    const monthsData = localStorage.getItem('months');
    if (monthsData) {
      const months = JSON.parse(monthsData);
      
      for (const month of months) {
        const monthId = month.id;
        
        // Save month-specific data
        const monthKeys = [
          `incomes_${monthId}`,
          `expenses_${monthId}`,
          `budgets_${monthId}`,
          `goals_${monthId}`,
          `debts_${monthId}`
        ];
        
        for (const key of monthKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            dataToSave[key] = JSON.parse(data);
          }
        }
      }
    }
    
    // Send all data to the server in a single request
    const response = await fetch('/api/replit-db/save-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: dataToSave }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save data');
    }
    
    console.log('Saving from localStorage to Replit DB completed successfully');
  } catch (error) {
    console.error('Error during save from localStorage to Replit DB:', error);
    throw error; // Re-throw to allow caller to handle
  }
};