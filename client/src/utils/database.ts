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
    if (!result || result.data === null || result.data === undefined) {
      return null;
    }
    
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
      console.warn(`Error response from last-save-time API: ${response.status}`);
      return null;
    }
    
    const result = await response.json();
    
    // Handle different response formats
    if (result && result.timestamp) {
      if (typeof result.timestamp === 'string') {
        return result.timestamp;
      } else if (result.timestamp.ok && result.timestamp.value) {
        return result.timestamp.value;
      }
    }
    
    // Fallback to localStorage if we can't get from server
    return localStorage.getItem('lastAutoSaveTime');
  } catch (error) {
    console.error("Error retrieving last save time:", error);
    // Fallback to localStorage
    return localStorage.getItem('lastAutoSaveTime');
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
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // First, explicitly save known important keys
    const importantKeys = [
      'months', 'goals', 'debts', 'scenarios', 'userProfile'
    ];
    
    for (const key of importantKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          dataToSave[key] = JSON.parse(data);
        } catch (e) {
          console.warn(`Failed to parse JSON for key ${key}, using raw value`);
          dataToSave[key] = data;
        }
      }
    }
    
    // Then, look for all month-specific keys
    for (const key of allKeys) {
      // Skip keys we've already processed
      if (importantKeys.includes(key)) continue;
      
      // Process month-specific data (keys like incomes_2025-04)
      if (key.match(/^(incomes|expenses|budgets|goals|debts)_\d{4}-\d{2}$/)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            dataToSave[key] = JSON.parse(data);
          } catch (e) {
            console.warn(`Failed to parse JSON for key ${key}, using raw value`);
            dataToSave[key] = data;
          }
        }
      }
    }
    
    // Finally, save recommendations, alerts and any other remaining financial data
    for (const key of allKeys) {
      if (key.startsWith('recommendations') || 
          key.startsWith('alerts') || 
          key.startsWith('savings_') || 
          key.startsWith('scenarios_')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            dataToSave[key] = JSON.parse(data);
          } catch (e) {
            console.warn(`Failed to parse JSON for key ${key}, using raw value`);
            dataToSave[key] = data;
          }
        }
      }
    }
    
    console.log(`Saving ${Object.keys(dataToSave).length} keys to Replit DB:`, 
      Object.keys(dataToSave).join(', '));
    
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
    
    // Update the last save time in localStorage to match the server
    localStorage.setItem('lastAutoSaveTime', new Date().toISOString());
  } catch (error) {
    console.error('Error during save from localStorage to Replit DB:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Create an emergency backup of all localStorage data
 * This saves everything as a single large record for disaster recovery
 */
export const createEmergencyBackup = async (): Promise<boolean> => {
  try {
    // Get all data from localStorage
    const allData: Record<string, any> = {};
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            // Try to parse it as JSON, but if it fails, store as string
            allData[key] = JSON.parse(value);
          } catch (e) {
            allData[key] = value;
          }
        }
      }
    }
    
    console.log(`Creating emergency backup with ${Object.keys(allData).length} keys`);
    
    // Send all data to the server as a single object
    const response = await fetch('/api/replit-db/emergency-backup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: allData }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create emergency backup');
    }
    
    const result = await response.json();
    console.log('Emergency backup completed successfully:', result);
    
    return true;
  } catch (error) {
    console.error('Error creating emergency backup:', error);
    return false;
  }
};

/**
 * Loads all data from the database and returns it
 * @returns Promise that resolves with all the finance data
 */
export const loadAllFinanceData = async (): Promise<{
  userProfile: any;
  months: any[];
  allIncomes: Record<string, any[]>;
  allExpenses: Record<string, any[]>;
  allBudgets: Record<string, any[]>;
  allGoals: Record<string, any[]>;
  allDebts: Record<string, any[]>;
  recommendations: any[];
  alerts: any[];
  scenarios: any[];
}> => {
  try {
    // First, get a list of all keys in the database
    const allKeys = await listDbKeys();
    
    // Create empty objects to store the data
    const result = {
      userProfile: {},
      months: [],
      allIncomes: {} as Record<string, any[]>,
      allExpenses: {} as Record<string, any[]>,
      allBudgets: {} as Record<string, any[]>,
      allGoals: {} as Record<string, any[]>,
      allDebts: {} as Record<string, any[]>,
      recommendations: [],
      alerts: [],
      scenarios: []
    };
    
    // Process each key and load the data
    for (const key of allKeys) {
      const data = await getFromDb(key);
      
      if (!data) continue;
      
      let value;
      
      // Handle different response formats
      if (typeof data === 'object' && data.ok !== undefined) {
        // It's in the {ok: true, value: string} format
        if (!data.ok) continue;
        value = data.value;
      } else {
        // It's another format or directly the value
        value = data;
      }
      
      // Make sure we have a valid value
      if (value === null || value === undefined) continue;
      
      // Parse the value if it's a string
      let parsedValue = value;
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch (e) {
          console.warn(`Failed to parse JSON for key ${key}, using raw value`);
          parsedValue = value;
        }
      }
      
      // Handle different types of data
      if (key === 'userProfile') {
        result.userProfile = parsedValue;
      } else if (key === 'months') {
        result.months = parsedValue;
      } else if (key === 'scenarios') {
        result.scenarios = parsedValue;
      } else if (key === 'recommendations') {
        result.recommendations = parsedValue;
      } else if (key === 'alerts') {
        result.alerts = parsedValue;
      } else if (key.startsWith('incomes_')) {
        const monthId = key.replace('incomes_', '');
        result.allIncomes[monthId] = parsedValue;
      } else if (key.startsWith('expenses_')) {
        const monthId = key.replace('expenses_', '');
        result.allExpenses[monthId] = parsedValue;
      } else if (key.startsWith('budgets_')) {
        const monthId = key.replace('budgets_', '');
        result.allBudgets[monthId] = parsedValue;
      } else if (key.startsWith('goals_')) {
        const monthId = key.replace('goals_', '');
        result.allGoals[monthId] = parsedValue;
      } else if (key.startsWith('debts_')) {
        const monthId = key.replace('debts_', '');
        result.allDebts[monthId] = parsedValue;
      }
    }
    
    console.log("Loaded data from database:", {
      userProfile: !!Object.keys(result.userProfile).length,
      months: result.months.length,
      allIncomes: Object.keys(result.allIncomes).length,
      allExpenses: Object.keys(result.allExpenses).length,
      allBudgets: Object.keys(result.allBudgets).length,
      allGoals: Object.keys(result.allGoals).length,
      allDebts: Object.keys(result.allDebts).length
    });
    
    return result;
  } catch (error) {
    console.error('Error loading finance data from database:', error);
    // Return empty defaults
    return {
      userProfile: {},
      months: [],
      allIncomes: {},
      allExpenses: {},
      allBudgets: {},
      allGoals: {},
      allDebts: {},
      recommendations: [],
      alerts: [],
      scenarios: []
    };
  }
};